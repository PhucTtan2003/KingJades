using System.Text.Json.Serialization;
namespace WebKingJades.Models.Dtos;

public class NotificationResponse
{
    public string Id { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    [JsonIgnore]
    public string TargetUrl { get; set; } = string.Empty;

    // Chỉ trả ID bản ghi liên hệ, không trả tên/SĐT/email.
    public string ReferenceId { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}