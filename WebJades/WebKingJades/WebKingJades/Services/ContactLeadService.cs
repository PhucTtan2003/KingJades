using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using System.Diagnostics;
using System.Text.RegularExpressions;
using WebKingJades.Models;
using WebKingJades.Settings;

namespace WebKingJades.Services;

public class ContactLeadService
{
    private readonly IMongoCollection<ContactLead> _contactLeads;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ContactLeadService> _logger;

    private static readonly HashSet<string> AllowedStatuses = new(
        new[] { "new", "contacted", "quoted", "closed", "cancelled" },
        StringComparer.OrdinalIgnoreCase
    );

    public ContactLeadService(
        IOptions<MongoDbSettings> settings,
        INotificationService notificationService,
        IMongoDatabase mongoDatabase,
        ILogger<ContactLeadService> logger)
    {
        _contactLeads = mongoDatabase.GetCollection<ContactLead>(
            settings.Value.ContactLeadsCollectionName
        );

        _notificationService = notificationService;
        _logger = logger;
    }

    // Chỉ gọi một lần tại startup qua Program.cs.
    public async Task EnsureIndexesAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var indexModels = new List<CreateIndexModel<ContactLead>>
            {
                new(
                    Builders<ContactLead>.IndexKeys
                        .Descending(x => x.CreatedAtUtc)
                ),
                new(
                    Builders<ContactLead>.IndexKeys
                        .Ascending(x => x.Status)
                        .Descending(x => x.CreatedAtUtc)
                ),
                new(
                    Builders<ContactLead>.IndexKeys
                        .Ascending(x => x.Phone)
                ),
                new(
                    Builders<ContactLead>.IndexKeys
                        .Ascending(x => x.ProductId)
                )
            };

            await _contactLeads.Indexes.CreateManyAsync(
                indexModels,
                cancellationToken: cancellationToken
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "[MongoDB] Không thể tạo indexes ContactLeads."
            );
        }
    }

    // =====================================
    // TẠO LIÊN HỆ VÀ THÔNG BÁO
    // =====================================
    public async Task<ContactLead> CreateAsync(ContactLead lead)
    {
        lead.FullName = (lead.FullName ?? "").Trim();
        lead.Phone = (lead.Phone ?? "").Trim();
        lead.Email = (lead.Email ?? "").Trim().ToLowerInvariant();
        lead.ProductId = lead.ProductId?.Trim() ?? "";
        lead.ProductName = lead.ProductName?.Trim() ?? "";
        lead.ProductSlug = lead.ProductSlug?.Trim() ?? "";
        lead.Need = lead.Need?.Trim() ?? "";
        lead.Message = lead.Message?.Trim() ?? "";

        lead.Source = string.IsNullOrWhiteSpace(lead.Source)
            ? "contact_page"
            : lead.Source.Trim();

        lead.Status = "new";
        lead.CreatedAtUtc = DateTime.UtcNow;
        lead.UpdatedAtUtc = lead.CreatedAtUtc;

        var leadTimer = Stopwatch.StartNew();

        await _contactLeads.InsertOneAsync(lead);

        leadTimer.Stop();

        var notificationTimer = Stopwatch.StartNew();

        // Giữ nguyên thứ tự: lưu lead xong mới tạo thông báo.
        await _notificationService.CreateAsync(
            "CONTACT_LEAD",
            "Có yêu cầu tư vấn mới",
            "Một khách hàng vừa gửi yêu cầu tư vấn.",
            "/admin-dashboard?tab=contact",
            new List<string> { "admin", "staff" },
            lead.Id ?? "",
            "System"
        );

        notificationTimer.Stop();

        if (
            leadTimer.ElapsedMilliseconds >= 500 ||
            notificationTimer.ElapsedMilliseconds >= 500
        )
        {
            // Không ghi họ tên, SĐT, email hay nội dung khách vào log.
            _logger.LogWarning(
                "[ContactLeadPerf] LeadInsert={LeadMs}ms, NotificationInsert={NotificationMs}ms, LeadId={LeadId}",
                leadTimer.ElapsedMilliseconds,
                notificationTimer.ElapsedMilliseconds,
                lead.Id
            );
        }

        return lead;
    }

    // =====================================
    // TÌM CHÍNH XÁC KHÁCH THEO ID
    // =====================================
    public async Task<ContactLead?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;

        return await _contactLeads
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    // =====================================
    // DANH SÁCH ADMIN
    // =====================================
    public async Task<(
        List<ContactLead> Leads,
        long Total
    )> GetAdminListAsync(
        int skip = 0,
        int take = 50,
        string? status = null,
        string? search = null,
        DateTime? fromUtc = null,
        DateTime? toUtc = null)
    {
        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 100);

        var builder = Builders<ContactLead>.Filter;
        var filters = new List<FilterDefinition<ContactLead>>();

        if (
            !string.IsNullOrWhiteSpace(status) &&
            !string.Equals(
                status,
                "all",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            filters.Add(
                builder.Eq(x => x.Status, NormalizeStatus(status))
            );
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var safeSearch = Regex.Escape(search.Trim());
            var regex = new BsonRegularExpression(safeSearch, "i");

            filters.Add(builder.Or(
                builder.Regex(x => x.FullName, regex),
                builder.Regex(x => x.Phone, regex),
                builder.Regex(x => x.Email, regex),
                builder.Regex(x => x.ProductName, regex),
                builder.Regex(x => x.Message, regex)
            ));
        }

        if (fromUtc.HasValue)
        {
            filters.Add(
                builder.Gte(x => x.CreatedAtUtc, fromUtc.Value)
            );
        }

        if (toUtc.HasValue)
        {
            filters.Add(
                builder.Lte(x => x.CreatedAtUtc, toUtc.Value)
            );
        }

        var filter = filters.Count > 0
            ? builder.And(filters)
            : builder.Empty;

        var total = await _contactLeads.CountDocumentsAsync(filter);

        var leads = await _contactLeads
            .Find(filter)
            .SortByDescending(x => x.CreatedAtUtc)
            .Skip(skip)
            .Limit(take)
            .ToListAsync();

        return (leads, total);
    }

    // =====================================
    // UPDATE TRẠNG THÁI / GHI CHÚ
    // =====================================
    public async Task<ContactLead?> UpdateStatusAsync(
        string id,
        string status,
        string? internalNote,
        string handledBy)
    {
        if (!ObjectId.TryParse(id, out _))
            return null;

        var normalizedStatus = NormalizeStatus(status);

        if (!AllowedStatuses.Contains(normalizedStatus))
        {
            throw new ArgumentException(
                "Trạng thái lead không hợp lệ."
            );
        }

        var updates = new List<UpdateDefinition<ContactLead>>
        {
            Builders<ContactLead>.Update.Set(
                x => x.Status,
                normalizedStatus
            ),
            Builders<ContactLead>.Update.Set(
                x => x.UpdatedAtUtc,
                DateTime.UtcNow
            )
        };

        if (internalNote != null)
        {
            updates.Add(
                Builders<ContactLead>.Update.Set(
                    x => x.InternalNote,
                    internalNote.Trim()
                )
            );
        }

        if (
            !string.Equals(
                normalizedStatus,
                "new",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            updates.Add(
                Builders<ContactLead>.Update.Set(
                    x => x.HandledBy,
                    handledBy
                )
            );

            updates.Add(
                Builders<ContactLead>.Update.Set(
                    x => x.HandledAtUtc,
                    DateTime.UtcNow
                )
            );
        }

        return await _contactLeads.FindOneAndUpdateAsync(
            x => x.Id == id,
            Builders<ContactLead>.Update.Combine(updates),
            new FindOneAndUpdateOptions<ContactLead>
            {
                ReturnDocument = ReturnDocument.After
            }
        );
    }

    private static string NormalizeStatus(string? status)
    {
        var value = (status ?? "new").Trim().ToLowerInvariant();

        return string.IsNullOrWhiteSpace(value)
            ? "new"
            : value;
    }
}