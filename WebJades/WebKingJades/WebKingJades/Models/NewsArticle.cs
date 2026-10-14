using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebKingJades.Features.News.Models;

public sealed class NewsArticle
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;

    public string CoverImageUrl { get; set; } = string.Empty;
    public string? BannerImageUrl { get; set; }

    public string Category { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();

    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.String)]
    public NewsStatus Status { get; set; } = NewsStatus.Draft;

    public bool IsFeatured { get; set; }
    public bool ShowOnHomePage { get; set; }

    public DateTime? PublishedAtUtc { get; set; }
    public DateTime? ScheduledAtUtc { get; set; }

    public long ViewCount { get; set; }

    // Admin-controlled public article rating: 0 = hidden, 1..5 = stars.
    // Editorial rating set by Admin (0 = hidden).
    public int Rating { get; set; }

    // Aggregated rating submitted from client/public users.
    public double CustomerRatingAverage { get; set; }
    public long CustomerRatingCount { get; set; }

    public List<NewsBlock> Blocks { get; set; } = new();
    public NewsSeo Seo { get; set; } = new();
    public NewsTypography Typography { get; set; } = new();
    public NewsTextStyle TextStyle { get; set; } = new();

    public bool IsDeleted { get; set; }

    public int Version { get; set; } = 1;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
