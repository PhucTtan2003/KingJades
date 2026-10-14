using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebKingJades.Services;

namespace WebKingJades.Controllers
{
    [ApiController]
    [Authorize(Roles = "admin,staff")]
    [Route("api/notifications")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(
            INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private string? GetRoleName()
        {
            return User.FindFirstValue(ClaimTypes.Role)
                ?? User.FindFirst("roleName")?.Value;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            CancellationToken cancellationToken)
        {
            var roleName = GetRoleName();

            if (string.IsNullOrWhiteSpace(roleName))
                return Forbid();

            var result = await _notificationService.GetForUserAsync(
                roleName,
                cancellationToken
            );

            return Ok(result);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount(
            CancellationToken cancellationToken)
        {
            var roleName = GetRoleName();

            if (string.IsNullOrWhiteSpace(roleName))
                return Forbid();

            var count = await _notificationService.GetUnreadCountAsync(
                roleName,
                cancellationToken
            );

            return Ok(new { count });
        }

        [HttpPatch("{id}/read")]
        public async Task<IActionResult> MarkRead(
            string id,
            CancellationToken cancellationToken)
        {
            var roleName = GetRoleName();

            if (string.IsNullOrWhiteSpace(roleName))
                return Forbid();

            var found = await _notificationService.MarkReadAsync(
                id,
                roleName,
                cancellationToken
            );

            if (!found)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy thông báo."
                });
            }

            return Ok(new { success = true });
        }

        [HttpPatch("read-all")]
        public async Task<IActionResult> ReadAll(
            CancellationToken cancellationToken)
        {
            var roleName = GetRoleName();

            if (string.IsNullOrWhiteSpace(roleName))
                return Forbid();

            var modifiedCount =
                await _notificationService.MarkAllReadAsync(
                    roleName,
                    cancellationToken
                );

            return Ok(new
            {
                success = true,
                modifiedCount
            });
        }
    }
}