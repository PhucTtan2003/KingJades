using System.Text.Json;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Dtos;

public sealed class NewsBlockRequest
{
    public string? Id { get; set; }
    public NewsBlockType Type { get; set; }
    public int Order { get; set; }
    public JsonElement Content { get; set; }
    public JsonElement Settings { get; set; }
    public NewsBlockResponsive Responsive { get; set; } = new();
}

public sealed class NewsBlockResponse
{
    public string Id { get; set; } = string.Empty;
    public NewsBlockType Type { get; set; }
    public int Order { get; set; }
    public JsonElement Content { get; set; }
    public JsonElement Settings { get; set; }
    public NewsBlockResponsive Responsive { get; set; } = new();
}
