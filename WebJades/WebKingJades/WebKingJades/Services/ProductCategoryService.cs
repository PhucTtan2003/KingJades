using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using WebKingJades.Models;
using WebKingJades.Settings;

namespace WebKingJades.Services;

public class ProductCategoryService
{
    private readonly IMongoCollection<ProductCategory> _categories;

    public ProductCategoryService(
        IOptions<MongoDbSettings> settings
    )
    {
        var client =
            new MongoClient(
                settings.Value.ConnectionString
            );

        var database =
            client.GetDatabase(
                settings.Value.DatabaseName
            );

        _categories =
            database.GetCollection<ProductCategory>(
                "ProductCategories"
            );

        EnsureIndexes();
    }

    private void EnsureIndexes()
    {
        try
        {
            var indexes =
                new List<CreateIndexModel<ProductCategory>>
                {
                    new(
                        Builders<ProductCategory>
                            .IndexKeys
                            .Ascending(x => x.ParentId)
                            .Ascending(x => x.SortOrder),
                        new CreateIndexOptions
                        {
                            Name = "ix_product_categories_parent_sort"
                        }
                    ),

                    /*
                     * Giữ unique slug như kiến trúc cũ.
                     * Category mới sẽ tự tìm slug chưa dùng thay vì
                     * làm thay đổi slug của category hiện hữu.
                     */
                    new(
                        Builders<ProductCategory>
                            .IndexKeys
                            .Ascending(x => x.Slug),
                        new CreateIndexOptions
                        {
                            Name = "ux_product_categories_slug",
                            Unique = true
                        }
                    )
                };

            _categories.Indexes.CreateMany(indexes);
        }
        catch
        {
            /*
             * Không làm app crash nếu database cũ đang có index khác.
             * Giữ hành vi tương thích với service trước đây.
             */
        }
    }

    public async Task<List<ProductCategory>> GetAllAsync()
    {
        return await _categories
            .Find(_ => true)
            .SortBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<List<ProductCategory>> GetPublicAllAsync()
    {
        return await _categories
            .Find(x =>
                x.IsActive &&
                x.ShowOnMenu
            )
            .SortBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<List<ProductCategory>> GetParentsAsync()
    {
        return await _categories
            .Find(x =>
                x.ParentId == "" &&
                x.IsActive
            )
            .SortBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<List<ProductCategory>> GetChildrenAsync(
        string parentId
    )
    {
        return await _categories
            .Find(x =>
                x.ParentId == parentId &&
                x.IsActive
            )
            .SortBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync();
    }

    public async Task<ProductCategory?> GetByIdAsync(
        string id
    )
    {
        return await _categories
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<ProductCategory?> GetBySlugAsync(
        string slug
    )
    {
        var normalized =
            GenerateSlug(slug);

        var categories =
            await _categories
                .Find(_ => true)
                .ToListAsync();

        return categories
            .FirstOrDefault(x =>
                string.Equals(
                    GenerateSlug(x.Name),
                    normalized,
                    StringComparison.OrdinalIgnoreCase
                )
                ||
                string.Equals(
                    GenerateSlug(x.Slug ?? ""),
                    normalized,
                    StringComparison.OrdinalIgnoreCase
                )
            );
    }

    public async Task<ProductCategory?> FindByNameAsync(
        string name,
        string parentId
    )
    {
        var cleanName =
            name.Trim();

        var cleanParentId =
            parentId.Trim();

        var candidates =
            await _categories
                .Find(x =>
                    x.ParentId == cleanParentId
                )
                .ToListAsync();

        return candidates
            .FirstOrDefault(x =>
                string.Equals(
                    x.Name?.Trim(),
                    cleanName,
                    StringComparison.OrdinalIgnoreCase
                )
            );
    }

    public async Task<ProductCategory> CreateAsync(
        ProductCategory category
    )
    {
        category.Name =
            category.Name.Trim();

        category.ParentId =
            category.ParentId?.Trim()
            ?? string.Empty;

        category.ParentName =
            category.ParentName?.Trim()
            ?? string.Empty;

        category.MenuGroupId =
            category.MenuGroupId?.Trim()
            ?? string.Empty;

        category.MenuGroupName =
            category.MenuGroupName?.Trim()
            ?? string.Empty;

        /*
         * Category mới được tạo slug sạch + unique.
         *
         * Không đổi slug của category cũ.
         * Vì vậy URL/filter đang hoạt động không bị rewrite.
         */
        var requestedSlug =
            string.IsNullOrWhiteSpace(
                category.Slug
            )
                ? category.Name
                : category.Slug;

        category.Slug =
            await BuildUniqueSlugAsync(
                requestedSlug
            );

        category.CreatedAtUtc =
            DateTime.UtcNow;

        category.UpdatedAtUtc =
            DateTime.UtcNow;

        await _categories.InsertOneAsync(
            category
        );

        return category;
    }

    /*
     * Chỉ cập nhật metadata trình bày.
     *
     * Cố ý KHÔNG sửa:
     * - Name
     * - Slug
     * - ParentId
     * - ParentName
     *
     * để không làm lệch Product cũ hoặc URL/filter hiện tại.
     */
    public async Task<bool> UpdatePresentationAsync(
        string id,
        int sortOrder,
        bool isActive,
        bool showOnMenu,
        string menuGroupId,
        string menuGroupName
    )
    {
        var update =
            Builders<ProductCategory>
                .Update
                .Set(
                    x => x.SortOrder,
                    sortOrder
                )
                .Set(
                    x => x.IsActive,
                    isActive
                )
                .Set(
                    x => x.ShowOnMenu,
                    showOnMenu
                )
                .Set(
                    x => x.MenuGroupId,
                    menuGroupId?.Trim()
                    ?? string.Empty
                )
                .Set(
                    x => x.MenuGroupName,
                    menuGroupName?.Trim()
                    ?? string.Empty
                )
                .Set(
                    x => x.UpdatedAtUtc,
                    DateTime.UtcNow
                );

        var result =
            await _categories
                .UpdateOneAsync(
                    x => x.Id == id,
                    update
                );

        return result.MatchedCount > 0;
    }

    public async Task<bool> DeleteAsync(
        string id
    )
    {
        var result =
            await _categories
                .DeleteOneAsync(
                    x => x.Id == id
                );

        return result.DeletedCount > 0;
    }

    public async Task<long> CountChildrenAsync(
        string parentId
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                parentId
            )
        )
        {
            return 0;
        }

        return await _categories
            .CountDocumentsAsync(
                x => x.ParentId == parentId
            );
    }

    private async Task<string> BuildUniqueSlugAsync(
        string value
    )
    {
        var baseSlug =
            GenerateSlug(value);

        if (
            string.IsNullOrWhiteSpace(
                baseSlug
            )
        )
        {
            baseSlug =
                "product-category";
        }

        var candidate =
            baseSlug;

        var counter =
            2;

        while (
            await _categories
                .Find(x =>
                    x.Slug == candidate
                )
                .AnyAsync()
        )
        {
            candidate =
                $"{baseSlug}-{counter}";

            counter++;
        }

        return candidate;
    }

    private static string GenerateSlug(
        string value
    )
    {
        if (
            string.IsNullOrWhiteSpace(
                value
            )
        )
        {
            return string.Empty;
        }

        var normalized =
            value
                .Normalize(
                    NormalizationForm.FormD
                );

        normalized =
            new string(
                normalized
                    .Where(c =>
                        CharUnicodeInfo
                            .GetUnicodeCategory(c)
                        !=
                        UnicodeCategory
                            .NonSpacingMark
                    )
                    .ToArray()
            );

        normalized =
            normalized
                .Normalize(
                    NormalizationForm.FormC
                )
                .ToLowerInvariant()
                .Trim()
                .Replace("đ", "d");

        normalized =
            Regex.Replace(
                normalized,
                @"\s+",
                "-"
            );

        normalized =
            Regex.Replace(
                normalized,
                @"[^a-z0-9\-]",
                ""
            );

        normalized =
            Regex.Replace(
                normalized,
                @"-+",
                "-"
            );

        return normalized.Trim('-');
    }
}
