using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using WebKingJades.Hubs;
using WebKingJades.Models;
using WebKingJades.Models.Dtos;
using WebKingJades.Settings;

namespace WebKingJades.Services;

public class NotificationService : INotificationService
{
    private readonly IMongoCollection<Notification> _notifications;
    private readonly IHubContext<AdminNotificationHub> _hub;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IMongoDatabase database,
        IHubContext<AdminNotificationHub> hub,
        ILogger<NotificationService> logger)
    {
        _notifications =
            database.GetCollection<Notification>("notifications");

        _hub = hub;
        _logger = logger;
    }

    private static (
        string Title,
        string Message,
        string TargetUrl
    ) SafeContent(string? type)
    {
        switch ((type ?? "").ToUpperInvariant())
        {
            case "CONTACT_LEAD":
            case "CONTACT":
                return (
                    "Có yêu cầu tư vấn mới",
                    "Một khách hàng vừa gửi yêu cầu tư vấn.",
                    "/admin-dashboard?tab=contact"
                );

            case "NEWS_PUBLISHED":
            case "NEWS_SCHEDULED_PUBLISHED":
                return (
                    "Có bài viết được xuất bản",
                    "Một bài viết vừa được xuất bản.",
                    "/admin-dashboard?tab=news"
                );

            default:
                return (
                    "Có thông báo mới",
                    "Có cập nhật mới trong hệ thống.",
                    "/admin-dashboard"
                );
        }
    }

    public async Task CreateAsync(
        string type,
        string title,
        string message,
        string targetUrl,
        List<string> receiverRoles,
        string referenceId = "",
        string createdBy = "System")
    {
        var safe = SafeContent(type);

        var notification = new Notification
        {
            Type = type ?? "",
            Title = safe.Title,
            Message = safe.Message,
            TargetUrl = safe.TargetUrl,
            ReferenceId = referenceId,
            ReceiverRoles = receiverRoles ?? new List<string>(),
            CreatedBy = createdBy,
            CreatedAtUtc = DateTime.UtcNow
        };

        // 1. Lưu vào MongoDB trước để Admin offline
        //    vẫn xem lại được.
        await _notifications.InsertOneAsync(notification);

        // 2. Phát tín hiệu real-time.
        //    Không gửi dữ liệu cá nhân của khách.
        try
        {
            await _hub.Clients
                .Group(AdminNotificationHub.AdminGroup)
                .SendAsync(AdminNotificationHub.ChangedEvent);
        }
        catch (Exception ex)
        {
            // Lỗi kết nối SignalR không được làm
            // mất một Notification đã lưu thành công.
            _logger.LogWarning(
                ex,
                "Không thể phát tín hiệu notification realtime."
            );
        }
    }

    public async Task<List<NotificationResponse>> GetForUserAsync(
        string roleName,
        CancellationToken cancellationToken)
    {
        var filter = Builders<Notification>.Filter.AnyEq(
            x => x.ReceiverRoles,
            roleName
        );

        var items = await _notifications
            .Find(filter)
            .SortByDescending(x => x.CreatedAtUtc)
            .Limit(50)
            .Project(x => new NotificationResponse
            {
                Id = x.Id!,
                Type = x.Type,
                ReferenceId = x.ReferenceId,
                IsRead = x.IsRead,
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        // Không trả Title/Message/TargetUrl cũ
        // từ MongoDB vì có thể chứa PII.
        foreach (var item in items)
        {
            var safe = SafeContent(item.Type);

            item.Title = safe.Title;
            item.Message = safe.Message;
            item.TargetUrl = safe.TargetUrl;
            item.ReferenceId ??= "";
        }

        return items;
    }

    public async Task<long> GetUnreadCountAsync(
        string roleName,
        CancellationToken cancellationToken)
    {
        var filter = Builders<Notification>.Filter.And(
            Builders<Notification>.Filter.AnyEq(
                x => x.ReceiverRoles,
                roleName
            ),
            Builders<Notification>.Filter.Eq(
                x => x.IsRead,
                false
            )
        );

        return await _notifications.CountDocumentsAsync(
            filter,
            cancellationToken: cancellationToken
        );
    }

    public async Task<bool> MarkReadAsync(
        string id,
        string roleName,
        CancellationToken cancellationToken)
    {
        if (!ObjectId.TryParse(id, out _))
            return false;

        var filter = Builders<Notification>.Filter.And(
            Builders<Notification>.Filter.Eq(
                x => x.Id,
                id
            ),
            Builders<Notification>.Filter.AnyEq(
                x => x.ReceiverRoles,
                roleName
            )
        );

        var update = Builders<Notification>.Update
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAtUtc, DateTime.UtcNow);

        var result = await _notifications.UpdateOneAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        // Có thể bấm lại một thông báo đã đọc.
        return result.MatchedCount > 0;
    }

    public async Task<long> MarkAllReadAsync(
        string roleName,
        CancellationToken cancellationToken)
    {
        var filter = Builders<Notification>.Filter.And(
            Builders<Notification>.Filter.AnyEq(
                x => x.ReceiverRoles,
                roleName
            ),
            Builders<Notification>.Filter.Eq(
                x => x.IsRead,
                false
            )
        );

        var update = Builders<Notification>.Update
            .Set(x => x.IsRead, true)
            .Set(x => x.ReadAtUtc, DateTime.UtcNow);

        var result = await _notifications.UpdateManyAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount;
    }
}

