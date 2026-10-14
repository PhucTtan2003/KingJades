using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebKingJades.Hubs;

[Authorize(Roles = "admin,staff")]
public sealed class AdminNotificationHub : Hub
{
    public const string HubPath = "/hubs/admin-notifications";
    public const string AdminGroup = "kingjades-admin-notifications";
    public const string ChangedEvent = "notificationsChanged";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            AdminGroup,
            Context.ConnectionAborted
        );

        await base.OnConnectedAsync();
    }
}

