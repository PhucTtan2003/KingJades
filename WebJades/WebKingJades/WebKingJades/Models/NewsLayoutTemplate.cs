using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Features.News.Models;

public sealed class NewsLayoutTemplate
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;

    public bool IsDefault { get; set; }
    public bool IsDeleted { get; set; }

    public List<NewsBlock> Blocks { get; set; } = new();

    public string CreatedById { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
