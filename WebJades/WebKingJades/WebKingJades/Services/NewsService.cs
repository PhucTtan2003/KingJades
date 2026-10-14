using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Infrastructure;
using WebKingJades.Features.News.Models;
using WebKingJades.Features.News.Repositories;

using INotificationService =
    WebKingJades.Services.INotificationService;

namespace WebKingJades.Features.News.Services;

public sealed class NewsService : INewsService
{
    private readonly INewsRepository _repository;

    private readonly INotificationService _notificationService;

    public NewsService(
    INewsRepository repository,
    INotificationService notificationService)
    {
        _repository = repository;
        _notificationService = notificationService;
    }

    public async Task<WebKingJades.Features.News.Dtos.PagedResult<NewsListItemResponse>> GetAdminPageAsync(
    NewsQueryRequest query,
    CancellationToken cancellationToken)
    {
        var result = await _repository.GetAdminPageAsync(query, cancellationToken);

        return new WebKingJades.Features.News.Dtos.PagedResult<NewsListItemResponse>
        {
            Items = result.Items.Select(ToListItem).ToList(),
            TotalItems = result.TotalItems,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<PagedResult<NewsListItemResponse>> GetPublicPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken)
    {
        query.Status = NewsStatus.Published;

        var result = await _repository.GetPublicPageAsync(query, cancellationToken);

        return new PagedResult<NewsListItemResponse>
        {
            Items = result.Items.Select(ToListItem).ToList(),
            TotalItems = result.TotalItems,
            Page = result.Page,
            PageSize = result.PageSize
        };
    }

    public async Task<IReadOnlyList<NewsListItemResponse>> GetFeaturedAsync(
        int take,
        CancellationToken cancellationToken)
    {
        var items = await _repository.GetFeaturedAsync(take, cancellationToken);
        return items.Select(ToListItem).ToList();
    }

    public async Task<IReadOnlyList<NewsListItemResponse>> GetLatestAsync(
        int take,
        CancellationToken cancellationToken)
    {
        var items = await _repository.GetLatestAsync(take, cancellationToken);
        return items.Select(ToListItem).ToList();
    }

    public async Task<NewsArticleResponse> GetByIdAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var article = await GetRequiredAsync(id, cancellationToken);
        return ToResponse(article);
    }

    public async Task<NewsArticleResponse> GetPublicBySlugAsync(
        string slug,
        bool increaseView,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugHelper.Generate(slug);

        var article = await _repository.GetPublishedBySlugAsync(
            normalizedSlug,
            cancellationToken);

        if (article is null)
        {
            throw new NewsNotFoundException("Không tìm thấy bài viết.");
        }

        if (increaseView)
        {
            await _repository.IncrementViewAsync(
                article.Id,
                cancellationToken);

            article.ViewCount++;
        }

        return ToResponse(article);
    }

    public async Task<NewsRatingResponse> GetRatingAsync(
        string slug,
        string? userId,
        string? visitorId,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugHelper.Generate(slug);

        var article = await _repository.GetPublishedBySlugAsync(
            normalizedSlug,
            cancellationToken);

        if (article is null)
        {
            throw new NewsNotFoundException(
                "Không tìm thấy bài viết.");
        }

        var raterKey = BuildRaterKey(
            userId,
            visitorId);

        var myRating = 0;

        if (!string.IsNullOrWhiteSpace(raterKey))
        {
            var rating =
                await _repository.GetClientRatingAsync(
                    article.Id,
                    raterKey,
                    cancellationToken);

            myRating = rating?.Value ?? 0;
        }

        return ToRatingResponse(
            article,
            myRating,
            canRate:
                !string.IsNullOrWhiteSpace(
                    raterKey));
    }

    public async Task<NewsRatingResponse> SubmitRatingAsync(
        string slug,
        SubmitNewsRatingRequest request,
        string? userId,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = SlugHelper.Generate(slug);

        var article = await _repository.GetPublishedBySlugAsync(
            normalizedSlug,
            cancellationToken);

        if (article is null)
        {
            throw new NewsNotFoundException(
                "Không tìm thấy bài viết.");
        }

        var raterKey = BuildRaterKey(
            userId,
            request.VisitorId);

        if (string.IsNullOrWhiteSpace(raterKey))
        {
            throw new NewsValidationException(
                "Không xác định được người đánh giá. Hãy đăng nhập hoặc gửi visitorId hợp lệ.");
        }

        var now = DateTime.UtcNow;

        var clientRating = new NewsRating
        {
            ArticleId = article.Id,
            RaterKey = raterKey,
            UserId = NullIfWhiteSpace(userId),
            VisitorId = string.IsNullOrWhiteSpace(userId)
                ? NormalizeVisitorId(
                    request.VisitorId)
                : null,
            IsAuthenticated =
                !string.IsNullOrWhiteSpace(
                    userId),
            Value = Math.Clamp(
                request.Value,
                1,
                5),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _repository.UpsertClientRatingAsync(
            clientRating,
            cancellationToken);

        var summary =
            await _repository.RefreshClientRatingSummaryAsync(
                article.Id,
                cancellationToken);

        article.CustomerRatingAverage =
            summary.Average;

        article.CustomerRatingCount =
            summary.Count;

        return ToRatingResponse(
            article,
            clientRating.Value,
            canRate: true);
    }

    public async Task<NewsArticleResponse> CreateAsync(
        CreateNewsArticleRequest request,
        string authorId,
        string authorName,
        CancellationToken cancellationToken)
    {
        var slug = await BuildUniqueSlugAsync(
            request.Slug,
            request.Title,
            null,
            cancellationToken);

        var now = DateTime.UtcNow;

        var article = new NewsArticle
        {
            Title = request.Title.Trim(),
            Subtitle = request.Subtitle.Trim(),
            Slug = slug,
            Summary = request.Summary.Trim(),
            CoverImageUrl = request.CoverImageUrl.Trim(),
            BannerImageUrl = NullIfWhiteSpace(request.BannerImageUrl),
            Category = request.Category.Trim(),
            Tags = NormalizeTags(request.Tags),
            AuthorId = authorId,
            AuthorName = authorName,
            Status = NewsStatus.Draft,
            IsFeatured = request.IsFeatured,
            ShowOnHomePage = request.ShowOnHomePage,
            Rating = NormalizeRating(request.Rating),
            Blocks = MapBlocks(request.Blocks),
            Seo = NormalizeSeo(request.Seo),
            Typography = NormalizeTypography(request.Typography),
            TextStyle = NormalizeTextStyle(request.TextStyle),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Version = 1
        };

        await _repository.CreateAsync(article, cancellationToken);
        return ToResponse(article);
    }

    public async Task<NewsArticleResponse> UpdateAsync(
        string id,
        UpdateNewsArticleRequest request,
        CancellationToken cancellationToken)
    {
        var article = await GetRequiredAsync(id, cancellationToken);

        if (request.Version != article.Version)
        {
            throw new NewsConflictException(
                "Bài viết đã được chỉnh sửa ở phiên làm việc khác. Hãy tải lại dữ liệu.");
        }

        article.Title = request.Title.Trim();
        article.Subtitle = request.Subtitle.Trim();
        article.Slug = await BuildUniqueSlugAsync(
            request.Slug,
            request.Title,
            id,
            cancellationToken);
        article.Summary = request.Summary.Trim();
        article.CoverImageUrl = request.CoverImageUrl.Trim();
        article.BannerImageUrl = NullIfWhiteSpace(request.BannerImageUrl);
        article.Category = request.Category.Trim();
        article.Tags = NormalizeTags(request.Tags);
        article.IsFeatured = request.IsFeatured;
        article.ShowOnHomePage = request.ShowOnHomePage;
        article.Rating = NormalizeRating(request.Rating);
        article.Blocks = MapBlocks(request.Blocks);
        article.Seo = NormalizeSeo(request.Seo);
        article.Typography = NormalizeTypography(request.Typography);
        article.TextStyle = NormalizeTextStyle(request.TextStyle);
        article.UpdatedAtUtc = DateTime.UtcNow;
        article.Version++;

        var updated = await _repository.ReplaceAsync(
            article,
            request.Version,
            cancellationToken);

        if (!updated)
        {
            throw new NewsConflictException(
                "Không thể cập nhật do dữ liệu vừa được thay đổi.");
        }

        return ToResponse(article);
    }

    public async Task DeleteAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var deleted = await _repository.SoftDeleteAsync(id, cancellationToken);

        if (!deleted)
        {
            throw new NewsNotFoundException("Không tìm thấy bài viết.");
        }
    }

    public async Task<NewsArticleResponse> PublishAsync(
        string id,
        int version,
        CancellationToken cancellationToken)
    {
        var article = await GetRequiredAsync(id, cancellationToken);
        EnsureVersion(article, version);
        ValidateBeforePublish(article);

        var now = DateTime.UtcNow;

        article.Status = NewsStatus.Published;
        article.PublishedAtUtc ??= now;
        article.ScheduledAtUtc = null;
        article.UpdatedAtUtc = now;
        article.Version++;

        await ReplaceOrConflictAsync(
    article,
    version,
    cancellationToken
);



        await _notificationService.CreateAsync(

    "NEWS_PUBLISHED",

    "Bài viết mới đã xuất bản",

    $"Bài viết \"{article.Title}\" đã được xuất bản.",

    $"/news/{article.Slug}",

    new List<string>
    {
        "admin",
        "staff"
    },

    article.Id,

    "System"

);



        return ToResponse(article);
    }

    public async Task<NewsArticleResponse> UnpublishAsync(
        string id,
        int version,
        CancellationToken cancellationToken)
    {
        var article = await GetRequiredAsync(id, cancellationToken);
        EnsureVersion(article, version);

        article.Status = NewsStatus.Draft;
        article.ScheduledAtUtc = null;
        article.UpdatedAtUtc = DateTime.UtcNow;
        article.Version++;

        await ReplaceOrConflictAsync(article, version, cancellationToken);
        return ToResponse(article);
    }

    public async Task<NewsArticleResponse> ScheduleAsync(
        string id,
        int version,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken)
    {
        var article = await GetRequiredAsync(id, cancellationToken);
        EnsureVersion(article, version);
        ValidateBeforePublish(article);

        var normalizedUtc = scheduledAtUtc.Kind == DateTimeKind.Utc
            ? scheduledAtUtc
            : scheduledAtUtc.ToUniversalTime();

        if (normalizedUtc <= DateTime.UtcNow.AddMinutes(1))
        {
            throw new NewsValidationException(
                "Thời gian lên lịch phải lớn hơn thời gian hiện tại ít nhất 1 phút.");
        }

        article.Status = NewsStatus.Scheduled;
        article.ScheduledAtUtc = normalizedUtc;
        article.UpdatedAtUtc = DateTime.UtcNow;
        article.Version++;

        await ReplaceOrConflictAsync(article, version, cancellationToken);
        return ToResponse(article);
    }

    public async Task<NewsArticleResponse> DuplicateAsync(
        string id,
        string authorId,
        string authorName,
        CancellationToken cancellationToken)
    {
        var source = await GetRequiredAsync(id, cancellationToken);

        var title = $"{source.Title} - Bản sao";
        var slug = await BuildUniqueSlugAsync(
            null,
            title,
            null,
            cancellationToken);

        var now = DateTime.UtcNow;

        var clone = new NewsArticle
        {
            Title = title,
            Subtitle = source.Subtitle,
            Slug = slug,
            Summary = source.Summary,
            CoverImageUrl = source.CoverImageUrl,
            BannerImageUrl = source.BannerImageUrl,
            Category = source.Category,
            Tags = source.Tags.ToList(),
            AuthorId = authorId,
            AuthorName = authorName,
            Status = NewsStatus.Draft,
            IsFeatured = false,
            ShowOnHomePage = false,
            Rating = NormalizeRating(source.Rating),
            CustomerRatingAverage = 0,
            CustomerRatingCount = 0,
            Blocks = source.Blocks.Select(CloneBlock).ToList(),
            Seo = new NewsSeo
            {
                SeoTitle = source.Seo.SeoTitle,
                MetaDescription = source.Seo.MetaDescription,
                FocusKeyword = source.Seo.FocusKeyword,
                Keywords = source.Seo.Keywords,
                OpenGraphImageUrl = source.Seo.OpenGraphImageUrl,
                CanonicalUrl = null,
                Robots = source.Seo.Robots,
                SchemaType = source.Seo.SchemaType
            },
            Typography = NormalizeTypography(source.Typography),
            TextStyle = NormalizeTextStyle(source.TextStyle),
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Version = 1
        };

        await _repository.CreateAsync(clone, cancellationToken);
        return ToResponse(clone);
    }

    private async Task<NewsArticle> GetRequiredAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var article = await _repository.GetByIdAsync(id, cancellationToken);

        return article ?? throw new NewsNotFoundException(
            "Không tìm thấy bài viết.");
    }

    private async Task<string> BuildUniqueSlugAsync(
        string? requestedSlug,
        string title,
        string? exceptId,
        CancellationToken cancellationToken)
    {
        var baseSlug = SlugHelper.Generate(
            string.IsNullOrWhiteSpace(requestedSlug) ? title : requestedSlug);

        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = "news";
        }

        var slug = baseSlug;
        var suffix = 2;

        while (await _repository.SlugExistsAsync(
                   slug,
                   exceptId,
                   cancellationToken))
        {
            slug = $"{baseSlug}-{suffix++}";
        }

        return slug;
    }

    private static List<NewsBlock> MapBlocks(
        IEnumerable<NewsBlockRequest> blocks)
    {
        return blocks
            .Select((block, index) => block.ToModel(index))
            .OrderBy(x => x.Order)
            .Select((block, index) =>
            {
                block.Order = index;
                return block;
            })
            .ToList();
    }

    private static NewsBlock CloneBlock(NewsBlock source)
    {
        return new NewsBlock
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = source.Type,
            Order = source.Order,
            Content = source.Content.DeepClone().AsBsonDocument,
            Settings = source.Settings.DeepClone().AsBsonDocument,
            Responsive = new NewsBlockResponsive
            {
                HideOnDesktop = source.Responsive.HideOnDesktop,
                HideOnTablet = source.Responsive.HideOnTablet,
                HideOnMobile = source.Responsive.HideOnMobile,
                StackOnMobile = source.Responsive.StackOnMobile
            }
        };
    }

    private async Task ReplaceOrConflictAsync(
        NewsArticle article,
        int expectedVersion,
        CancellationToken cancellationToken)
    {
        var updated = await _repository.ReplaceAsync(
            article,
            expectedVersion,
            cancellationToken);

        if (!updated)
        {
            throw new NewsConflictException(
                "Dữ liệu đã thay đổi. Hãy tải lại bài viết.");
        }
    }

    private static void EnsureVersion(
        NewsArticle article,
        int requestedVersion)
    {
        if (article.Version != requestedVersion)
        {
            throw new NewsConflictException(
                "Phiên bản bài viết không còn mới nhất.");
        }
    }

    private static void ValidateBeforePublish(NewsArticle article)
    {
        if (string.IsNullOrWhiteSpace(article.Title))
        {
            throw new NewsValidationException(
                "Bài viết phải có tiêu đề.");
        }

        if (string.IsNullOrWhiteSpace(article.CoverImageUrl))
        {
            throw new NewsValidationException(
                "Bài viết phải có ảnh đại diện.");
        }

        if (article.Blocks.Count == 0)
        {
            throw new NewsValidationException(
                "Bài viết phải có ít nhất một block nội dung.");
        }
    }

    private static List<string> NormalizeTags(
        IEnumerable<string>? tags)
    {
        return (tags ?? Array.Empty<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
    }

    private static NewsSeo NormalizeSeo(NewsSeo? seo)
    {
        seo ??= new NewsSeo();

        var robots = string.IsNullOrWhiteSpace(seo.Robots)
            ? "index,follow"
            : seo.Robots.Trim();

        var schemaType = string.IsNullOrWhiteSpace(seo.SchemaType)
            ? "BlogPosting"
            : seo.SchemaType.Trim();

        return new NewsSeo
        {
            SeoTitle = seo.SeoTitle?.Trim() ?? string.Empty,
            MetaDescription = seo.MetaDescription?.Trim() ?? string.Empty,
            FocusKeyword = seo.FocusKeyword?.Trim() ?? string.Empty,
            Keywords = seo.Keywords?.Trim() ?? string.Empty,
            OpenGraphImageUrl = NullIfWhiteSpace(seo.OpenGraphImageUrl),
            CanonicalUrl = NullIfWhiteSpace(seo.CanonicalUrl),
            Robots = robots,
            SchemaType = schemaType
        };
    }

    private static NewsTypography NormalizeTypography(
        NewsTypography? typography)
    {
        typography ??= new NewsTypography();

        return new NewsTypography
        {
            TitleFont = NormalizeFont(
                typography.TitleFont,
                "Lora"),
            HeadingFont = NormalizeFont(
                typography.HeadingFont,
                "Lora"),
            BodyFont = NormalizeFont(
                typography.BodyFont,
                "SVN-Gilroy"),
            LetterSpacing = Math.Clamp(
                typography.LetterSpacing,
                -0.05m,
                0.20m),
            LineHeight = Math.Clamp(
                typography.LineHeight,
                1.2m,
                2.6m)
        };
    }

    private static NewsTextStyle NormalizeTextStyle(
        NewsTextStyle? style)
    {
        style ??= new NewsTextStyle();

        return new NewsTextStyle
        {
            TitleSize = Math.Clamp(style.TitleSize, 28, 88),
            HeadingSize = Math.Clamp(style.HeadingSize, 20, 56),
            BodySize = Math.Clamp(style.BodySize, 13, 24),
            TitleColor = NormalizeColor(
                style.TitleColor,
                "#142543"),
            HeadingColor = NormalizeColor(
                style.HeadingColor,
                "#142543"),
            BodyColor = NormalizeColor(
                style.BodyColor,
                "#5f655f"),
            LinkColor = NormalizeColor(
                style.LinkColor,
                "#0b5d48"),
            TitleAlign = NormalizeAlign(
                style.TitleAlign,
                "center"),
            BodyAlign = NormalizeAlign(
                style.BodyAlign,
                "left"),
            ContentWidth = Math.Clamp(
                style.ContentWidth,
                620,
                1100)
        };
    }

    private static string NormalizeFont(
        string? value,
        string fallback)
    {
        var normalized = value?.Trim();

        return string.IsNullOrWhiteSpace(normalized)
            ? fallback
            : normalized;
    }

    private static string NormalizeColor(
        string? value,
        string fallback)
    {
        var normalized = value?.Trim();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return fallback;
        }

        return normalized.Length <= 32
            ? normalized
            : fallback;
    }

    private static string NormalizeAlign(
        string? value,
        string fallback)
    {
        var normalized = value?
            .Trim()
            .ToLowerInvariant();

        return normalized is
            "left" or "center" or "right" or "justify"
                ? normalized
                : fallback;
    }

    private static string? NormalizeVisitorId(
        string? visitorId)
    {
        if (string.IsNullOrWhiteSpace(visitorId))
        {
            return null;
        }

        var normalized = visitorId.Trim();

        if (normalized.Length < 8 ||
            normalized.Length > 120)
        {
            return null;
        }

        var valid = normalized.All(
            character =>
                char.IsLetterOrDigit(character) ||
                character is '-' or '_' or ':');

        return valid
            ? normalized
            : null;
    }

    private static string? BuildRaterKey(
        string? userId,
        string? visitorId)
    {
        var normalizedUserId =
            NullIfWhiteSpace(userId);

        if (!string.IsNullOrWhiteSpace(
                normalizedUserId))
        {
            return $"user:{normalizedUserId}";
        }

        var normalizedVisitorId =
            NormalizeVisitorId(visitorId);

        return string.IsNullOrWhiteSpace(
                normalizedVisitorId)
            ? null
            : $"visitor:{normalizedVisitorId}";
    }

    private static double CalculateOverallRating(
        NewsArticle article)
    {
        var adminRating =
            NormalizeRating(article.Rating);

        var customerCount =
            Math.Max(
                0,
                article.CustomerRatingCount);

        var customerAverage =
            Math.Clamp(
                article.CustomerRatingAverage,
                0d,
                5d);

        if (adminRating <= 0 &&
            customerCount <= 0)
        {
            return 0d;
        }

        if (customerCount <= 0)
        {
            return adminRating;
        }

        if (adminRating <= 0)
        {
            return Math.Round(
                customerAverage,
                2,
                MidpointRounding.AwayFromZero);
        }

        return Math.Round(
            (
                customerAverage *
                customerCount +
                adminRating
            ) /
            (customerCount + 1d),
            2,
            MidpointRounding.AwayFromZero);
    }

    private static NewsRatingResponse ToRatingResponse(
        NewsArticle article,
        int myRating,
        bool canRate)
    {
        return new NewsRatingResponse
        {
            ArticleId = article.Id,
            Slug = article.Slug,
            AdminRating =
                NormalizeRating(
                    article.Rating),
            CustomerRatingAverage =
                Math.Round(
                    Math.Clamp(
                        article.CustomerRatingAverage,
                        0d,
                        5d),
                    2,
                    MidpointRounding.AwayFromZero),
            CustomerRatingCount =
                Math.Max(
                    0,
                    article.CustomerRatingCount),
            OverallRating =
                CalculateOverallRating(
                    article),
            MyRating = Math.Clamp(
                myRating,
                0,
                5),
            CanRate = canRate
        };
    }

    private static int NormalizeRating(int rating)
    {
        return Math.Clamp(rating, 0, 5);
    }

    private static string? NullIfWhiteSpace(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static NewsArticleResponse ToResponse(NewsArticle article)
    {
        return new NewsArticleResponse
        {
            Id = article.Id,
            Title = article.Title,
            Subtitle = article.Subtitle,
            Slug = article.Slug,
            Summary = article.Summary,
            CoverImageUrl = article.CoverImageUrl,
            BannerImageUrl = article.BannerImageUrl,
            Category = article.Category,
            Tags = article.Tags,
            AuthorId = article.AuthorId,
            AuthorName = article.AuthorName,
            Status = article.Status,
            IsFeatured = article.IsFeatured,
            ShowOnHomePage = article.ShowOnHomePage,
            PublishedAtUtc = article.PublishedAtUtc,
            ScheduledAtUtc = article.ScheduledAtUtc,
            ViewCount = article.ViewCount,
            Rating = NormalizeRating(article.Rating),
            CustomerRatingAverage = Math.Round(
                Math.Clamp(
                    article.CustomerRatingAverage,
                    0d,
                    5d),
                2,
                MidpointRounding.AwayFromZero),
            CustomerRatingCount = Math.Max(
                0,
                article.CustomerRatingCount),
            OverallRating = CalculateOverallRating(article),
            Blocks = article.Blocks
                .OrderBy(x => x.Order)
                .Select(x => x.ToResponse())
                .ToList(),
            Seo = NormalizeSeo(article.Seo),
            Typography = NormalizeTypography(article.Typography),
            TextStyle = NormalizeTextStyle(article.TextStyle),
            Version = article.Version,
            CreatedAtUtc = article.CreatedAtUtc,
            UpdatedAtUtc = article.UpdatedAtUtc
        };
    }

    private static NewsListItemResponse ToListItem(NewsArticle article)
    {
        return new NewsListItemResponse
        {
            Id = article.Id,
            Title = article.Title,
            Subtitle = article.Subtitle,
            Slug = article.Slug,
            Summary = article.Summary,
            CoverImageUrl = article.CoverImageUrl,
            Category = article.Category,
            AuthorName = article.AuthorName,
            Status = article.Status,
            IsFeatured = article.IsFeatured,
            ShowOnHomePage = article.ShowOnHomePage,
            PublishedAtUtc = article.PublishedAtUtc,
            UpdatedAtUtc = article.UpdatedAtUtc,
            ViewCount = article.ViewCount,
            Rating = NormalizeRating(article.Rating),
            CustomerRatingAverage = Math.Round(
                Math.Clamp(
                    article.CustomerRatingAverage,
                    0d,
                    5d),
                2,
                MidpointRounding.AwayFromZero),
            CustomerRatingCount = Math.Max(
                0,
                article.CustomerRatingCount),
            OverallRating = CalculateOverallRating(article),
            Typography = NormalizeTypography(article.Typography),
            TextStyle = NormalizeTextStyle(article.TextStyle),
            Version = article.Version
        };
    }
}
