namespace WebKingJades.Features.News.Models;

public sealed class NewsSeo
{
    public string SeoTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;

    // Rank Math-style fields for the custom King Jades CMS.
    public string FocusKeyword { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;

    public string? OpenGraphImageUrl { get; set; }
    public string? CanonicalUrl { get; set; }

    // Examples:
    // index,follow
    // noindex,follow
    public string Robots { get; set; } = "index,follow";

    // BlogPosting is the recommended default for a news/blog article.
    public string SchemaType { get; set; } = "BlogPosting";
}
