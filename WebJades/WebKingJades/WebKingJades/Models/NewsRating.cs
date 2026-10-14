using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Features.News.Models;

public sealed class NewsRating
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    public string ArticleId { get; set; } = string.Empty;

    // user:<accountId> for authenticated users
    // visitor:<browserVisitorId> for anonymous/public clients
    public string RaterKey { get; set; } = string.Empty;

    public string? UserId { get; set; }
    public string? VisitorId { get; set; }
    public bool IsAuthenticated { get; set; }

    public int Value { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
