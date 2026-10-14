using System.ComponentModel.DataAnnotations;

namespace WebKingJades.Features.News.Dtos;

public class CreateNewsLayoutRequest
{
    [Required, MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string ThumbnailUrl { get; set; } = string.Empty;

    public bool IsDefault { get; set; }

    public List<NewsBlockRequest> Blocks { get; set; } = new();
}

public sealed class UpdateNewsLayoutRequest : CreateNewsLayoutRequest
{
}

public sealed class NewsLayoutResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public List<NewsBlockResponse> Blocks { get; set; } = new();
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
