using WebKingJades.Models.Dtos;

namespace WebKingJades.Services
{
    public interface INotificationService
    {
        Task CreateAsync(
            string type,
            string title,
            string message,
            string targetUrl,
            List<string> receiverRoles,
            string referenceId = "",
            string createdBy = "System"
        );

        Task<List<NotificationResponse>> GetForUserAsync(
            string roleName,
            CancellationToken cancellationToken
        );

        Task<long> GetUnreadCountAsync(
            string roleName,
            CancellationToken cancellationToken
        );

        Task<bool> MarkReadAsync(
            string id,
            string roleName,
            CancellationToken cancellationToken
        );

        Task<long> MarkAllReadAsync(
            string roleName,
            CancellationToken cancellationToken
        );
    }
}