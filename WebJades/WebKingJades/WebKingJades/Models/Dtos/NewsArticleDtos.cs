using System.ComponentModel.DataAnnotations;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Dtos;

public class CreateNewsArticleRequest
{
    [Required, MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(350)]
    public string Subtitle { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Slug { get; set; }

    [MaxLength(800)]
    public string Summary { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string CoverImageUrl { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? BannerImageUrl { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = new();

    public bool IsFeatured { get; set; }
    public bool ShowOnHomePage { get; set; }

    [Range(0, 5)]
    public int Rating { get; set; }

    public List<NewsBlockRequest> Blocks { get; set; } = new();

    public NewsSeo Seo { get; set; } = new();
    public NewsTypography Typography { get; set; } = new();
    public NewsTextStyle TextStyle { get; set; } = new();
}

public sealed class UpdateNewsArticleRequest : CreateNewsArticleRequest
{
    [Range(1, int.MaxValue)]
    public int Version { get; set; }
}

public sealed class ScheduleNewsRequest
{
    [Required]
    public DateTime ScheduledAtUtc { get; set; }
}

public sealed class NewsQueryRequest
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public NewsStatus? Status { get; set; }
    public bool? IsFeatured { get; set; }
    public bool? ShowOnHomePage { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 20;
}

public sealed class NewsArticleResponse
{
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
    public NewsStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public bool ShowOnHomePage { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public DateTime? ScheduledAtUtc { get; set; }
    public long ViewCount { get; set; }
    // Admin/editorial rating.
    public int Rating { get; set; }

    // Client/public rating aggregate.
    public double CustomerRatingAverage { get; set; }
    public long CustomerRatingCount { get; set; }

    // Combined display value:
    // admin rating counts as one editorial vote when it exists.
    public double OverallRating { get; set; }

    public List<NewsBlockResponse> Blocks { get; set; } = new();
    public NewsSeo Seo { get; set; } = new();
    public NewsTypography Typography { get; set; } = new();
    public NewsTextStyle TextStyle { get; set; } = new();
    public int Version { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class NewsListItemResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public NewsStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public bool ShowOnHomePage { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public long ViewCount { get; set; }
    public int Rating { get; set; }
    public double CustomerRatingAverage { get; set; }
    public long CustomerRatingCount { get; set; }
    public double OverallRating { get; set; }

    public NewsTypography Typography { get; set; } = new();
    public NewsTextStyle TextStyle { get; set; } = new();
    public int Version { get; set; }
}

public sealed class SubmitNewsRatingRequest
{
    [Range(1, 5)]
    public int Value { get; set; }

    // Anonymous/public browser identifier.
    // Ignored when the request is authenticated.
    [MaxLength(120)]
    public string? VisitorId { get; set; }
}

public sealed class NewsRatingResponse
{
    public string ArticleId { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;

    public int AdminRating { get; set; }

    public double CustomerRatingAverage { get; set; }
    public long CustomerRatingCount { get; set; }

    public double OverallRating { get; set; }

    // Current authenticated user / anonymous browser rating.
    public int MyRating { get; set; }

    public bool CanRate { get; set; } = true;
}

public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public long TotalItems { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public long TotalPages => PageSize <= 0 ? 0 : (long)Math.Ceiling(TotalItems / (double)PageSize);
}
