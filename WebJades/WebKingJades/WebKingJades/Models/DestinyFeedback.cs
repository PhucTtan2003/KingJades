using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Models;

public class DestinyFeedback
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string DisplayName { get; set; } = "Khách hàng";

    public int Rating { get; set; } = 5;

    public string Message { get; set; } = string.Empty;

    public string MainElement { get; set; } = string.Empty;

    public string MissingElement { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
