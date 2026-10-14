using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Infrastructure;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Controllers;

[AllowAnonymous]
public sealed class SeoNewsController : ControllerBase
{
    private const string DefaultSiteUrl = "https://kingjades.com";

    private readonly INewsService _newsService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SeoNewsController> _logger;

    public SeoNewsController(
        INewsService newsService,
        IConfiguration configuration,
        ILogger<SeoNewsController> logger)
    {
        _newsService = newsService;
        _configuration = configuration;
        _logger = logger;
    }

    // =====================================================
    // /news
    // =====================================================

    [HttpGet("/news")]
    public async Task<IActionResult> NewsIndex(
        CancellationToken cancellationToken)
    {
        try
        {
            var result =
                await _newsService.GetPublicPageAsync(
                    new NewsQueryRequest
                    {
                        Page = 1,
                        PageSize = 20
                    },
                    cancellationToken
                );

            var siteUrl = GetSiteUrl();

            var title =
                "Tin tức - Kiến thức về ngọc | King Jades";

            var description =
                "Tin tức và kiến thức về ngọc thiên nhiên, "
                + "ngọc cẩm thạch, ngọc phỉ thúy và trang sức "
                + "từ King Jades.";

            var canonical =
                $"{siteUrl}/news";

            var content =
                BuildNewsIndexContent(
                    result.Items,
                    siteUrl
                );

            var html =
                await BuildHtmlAsync(
                    title: title,
                    description: description,
                    canonical: canonical,
                    robots: "index,follow",
                    keywords: string.Empty,
                    ogImage: string.Empty,
                    schemaJson: BuildNewsIndexSchema(
                        siteUrl,
                        title,
                        description
                    ),
                    seoContent: content,
                    cancellationToken:
                        cancellationToken
                );

            return Content(
                html,
                "text/html; charset=utf-8"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Cannot render SEO news index."
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError
            );
        }
    }


    // =====================================================
    // /news/{slug}
    // =====================================================

    [HttpGet("/news/{slug}")]
    public async Task<IActionResult> NewsDetail(
        string slug,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return NotFound();
            }

            var article =
                await _newsService
                    .GetPublicBySlugAsync(
                        slug,
                        increaseView: false,
                        cancellationToken
                    );

            var siteUrl =
                GetSiteUrl();

            var seoTitle =
                GetSeoString(
                    article.Seo,
                    "SeoTitle"
                );

            var title =
                string.IsNullOrWhiteSpace(
                    seoTitle
                )
                    ? $"{article.Title} | King Jades"
                    : seoTitle.Trim();

            var seoDescription =
                GetSeoString(
                    article.Seo,
                    "MetaDescription"
                );

            var description =
                !string.IsNullOrWhiteSpace(
                    seoDescription
                )
                    ? seoDescription.Trim()
                    : !string.IsNullOrWhiteSpace(
                        article.Summary
                    )
                        ? article.Summary.Trim()
                        : article.Title;

            var robots =
                GetSeoString(
                    article.Seo,
                    "Robots"
                );

            if (string.IsNullOrWhiteSpace(
                robots))
            {
                robots = "index,follow";
            }

            var keywords =
                GetSeoString(
                    article.Seo,
                    "Keywords"
                );

            var configuredCanonical =
                GetSeoString(
                    article.Seo,
                    "CanonicalUrl"
                );

            var canonical =
                string.IsNullOrWhiteSpace(
                    configuredCanonical
                )
                    ? $"{siteUrl}/news/{article.Slug}"
                    : AbsoluteUrl(
                        configuredCanonical,
                        siteUrl
                    );

            var configuredOgImage =
                GetSeoString(
                    article.Seo,
                    "OpenGraphImageUrl"
                );

            var ogImage =
                !string.IsNullOrWhiteSpace(
                    configuredOgImage
                )
                    ? AbsoluteUrl(
                        configuredOgImage,
                        siteUrl
                    )
                    : AbsoluteUrl(
                        article.CoverImageUrl,
                        siteUrl
                    );

            var schemaType =
                GetSeoString(
                    article.Seo,
                    "SchemaType"
                );

            if (string.IsNullOrWhiteSpace(
                schemaType))
            {
                schemaType =
                    "BlogPosting";
            }

            var schema =
                BuildArticleSchema(
                    article,
                    schemaType,
                    title,
                    description,
                    canonical,
                    ogImage
                );

            var content =
                BuildArticleContent(
                    article,
                    siteUrl
                );

            var html =
                await BuildHtmlAsync(
                    title: title,
                    description: description,
                    canonical: canonical,
                    robots: robots,
                    keywords: keywords,
                    ogImage: ogImage,
                    schemaJson: schema,
                    seoContent: content,
                    cancellationToken:
                        cancellationToken
                );

            return Content(
                html,
                "text/html; charset=utf-8"
            );
        }
        catch (NewsNotFoundException)
        {
            return NotFound(
                BuildSimple404Html(
                    slug
                )
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Cannot render SEO news article. Slug={Slug}",
                slug
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError
            );
        }
    }


    // =====================================================
    // BUILD HTML SHELL
    // =====================================================

    private async Task<string> BuildHtmlAsync(
        string title,
        string description,
        string canonical,
        string robots,
        string keywords,
        string ogImage,
        string schemaJson,
        string seoContent,
        CancellationToken cancellationToken)
    {
        var indexPath =
            GetFrontendIndexPath();

        if (!System.IO.File.Exists(
            indexPath))
        {
            throw new FileNotFoundException(
                "Frontend index.html not found.",
                indexPath
            );
        }

        var html =
            await System.IO.File
                .ReadAllTextAsync(
                    indexPath,
                    cancellationToken
                );

        // Remove default title.
        html =
            Regex.Replace(
                html,
                @"<title>.*?</title>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        // Remove default description.
        html =
            Regex.Replace(
                html,
                @"<meta\s+name=[""']description[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        // Prevent duplicate canonical.
        html =
            Regex.Replace(
                html,
                @"<link\s+rel=[""']canonical[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        var head =
            BuildHeadHtml(
                title,
                description,
                canonical,
                robots,
                keywords,
                ogImage,
                schemaJson
            );

        html =
            Regex.Replace(
                html,
                @"</head>",
                head + "</head>",
                RegexOptions.IgnoreCase
            );

        // Put SEO HTML inside React root.
        // React will replace this content after JS starts.
        html =
            Regex.Replace(
                html,
                @"<div\s+id=[""']root[""']\s*>\s*</div>",
                $"<div id=\"root\">{seoContent}</div>",
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        return html;
    }


    private static string BuildHeadHtml(
        string title,
        string description,
        string canonical,
        string robots,
        string keywords,
        string ogImage,
        string schemaJson)
    {
        var sb =
            new StringBuilder();

        sb.AppendLine(
            $"<title>{Encode(title)}</title>"
        );

        sb.AppendLine(
            $"<meta name=\"description\" content=\"{EncodeAttribute(description)}\" />"
        );

        sb.AppendLine(
            $"<meta name=\"robots\" content=\"{EncodeAttribute(robots)}\" />"
        );

        if (!string.IsNullOrWhiteSpace(
            keywords))
        {
            sb.AppendLine(
                $"<meta name=\"keywords\" content=\"{EncodeAttribute(keywords)}\" />"
            );
        }

        sb.AppendLine(
            $"<link rel=\"canonical\" href=\"{EncodeAttribute(canonical)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:title\" content=\"{EncodeAttribute(title)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:description\" content=\"{EncodeAttribute(description)}\" />"
        );

        sb.AppendLine(
            "<meta property=\"og:type\" content=\"article\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:url\" content=\"{EncodeAttribute(canonical)}\" />"
        );

        if (!string.IsNullOrWhiteSpace(
            ogImage))
        {
            sb.AppendLine(
                $"<meta property=\"og:image\" content=\"{EncodeAttribute(ogImage)}\" />"
            );
        }

        sb.AppendLine(
            "<meta name=\"twitter:card\" content=\"summary_large_image\" />"
        );

        sb.AppendLine(
            $"<meta name=\"twitter:title\" content=\"{EncodeAttribute(title)}\" />"
        );

        sb.AppendLine(
            $"<meta name=\"twitter:description\" content=\"{EncodeAttribute(description)}\" />"
        );

        if (!string.IsNullOrWhiteSpace(
            ogImage))
        {
            sb.AppendLine(
                $"<meta name=\"twitter:image\" content=\"{EncodeAttribute(ogImage)}\" />"
            );
        }

        if (!string.IsNullOrWhiteSpace(
            schemaJson))
        {
            sb.AppendLine(
                "<script type=\"application/ld+json\">"
            );

            sb.AppendLine(
                schemaJson
            );

            sb.AppendLine(
                "</script>"
            );
        }

        return sb.ToString();
    }


    // =====================================================
    // ARTICLE CONTENT
    // =====================================================

    private static string BuildArticleContent(
        NewsArticleResponse article,
        string siteUrl)
    {
        var sb =
            new StringBuilder();

        sb.AppendLine(
            "<main class=\"kj-seo-prerender\">"
        );

        sb.AppendLine(
            "<article>"
        );

        sb.AppendLine(
            $"<h1>{Encode(article.Title)}</h1>"
        );

        if (!string.IsNullOrWhiteSpace(
            article.Subtitle))
        {
            sb.AppendLine(
                $"<p>{Encode(article.Subtitle)}</p>"
            );
        }

        if (!string.IsNullOrWhiteSpace(
            article.Summary))
        {
            sb.AppendLine(
                $"<p>{Encode(article.Summary)}</p>"
            );
        }

        if (!string.IsNullOrWhiteSpace(
            article.CoverImageUrl))
        {
            var imageUrl =
                AbsoluteUrl(
                    article.CoverImageUrl,
                    siteUrl
                );

            sb.AppendLine(
                "<figure>"
            );

            sb.AppendLine(
                $"<img src=\"{EncodeAttribute(imageUrl)}\" "
                + $"alt=\"{EncodeAttribute(article.Title)}\" />"
            );

            sb.AppendLine(
                "</figure>"
            );
        }

        foreach (
            var block in
            article.Blocks
                .OrderBy(x => x.Order))
        {
            RenderBlock(
                sb,
                block,
                siteUrl
            );
        }

        sb.AppendLine(
            "</article>"
        );

        sb.AppendLine(
            "</main>"
        );

        return sb.ToString();
    }


    private static void RenderBlock(
        StringBuilder sb,
        NewsBlockResponse block,
        string siteUrl)
    {
        var type =
            block.Type.ToString();

        var content =
            block.Content;

        switch (type)
        {
            case "Heading":
                {
                    var rawText =
                        GetJsonString(
                            content,
                            "textHtml"
                        );

                    if (string.IsNullOrWhiteSpace(
                        rawText))
                    {
                        rawText =
                            GetJsonString(
                                content,
                                "text"
                            );
                    }

                    var text =
                        PlainText(
                            rawText
                        );

                    if (string.IsNullOrWhiteSpace(
                        text))
                    {
                        return;
                    }

                    var level =
                        GetJsonInt(
                            content,
                            "level",
                            2
                        );

                    level =
                        Math.Clamp(
                            level,
                            2,
                            5
                        );

                    sb.AppendLine(
                        $"<h{level}>{Encode(text)}</h{level}>"
                    );

                    break;
                }

            case "Text":
                {
                    var html =
                        GetJsonString(
                            content,
                            "html"
                        );

                    var text =
                        PlainText(
                            html
                        );

                    if (!string.IsNullOrWhiteSpace(
                        text))
                    {
                        sb.AppendLine(
                            $"<p>{Encode(text)}</p>"
                        );
                    }

                    break;
                }

            case "Image":
                {
                    var imageUrl =
                        GetJsonString(
                            content,
                            "imageUrl"
                        );

                    if (string.IsNullOrWhiteSpace(
                        imageUrl))
                    {
                        return;
                    }

                    var alt =
                        GetJsonString(
                            content,
                            "alt"
                        );

                    var caption =
                        GetJsonString(
                            content,
                            "captionHtml"
                        );

                    if (string.IsNullOrWhiteSpace(
                        caption))
                    {
                        caption =
                            GetJsonString(
                                content,
                                "caption"
                            );
                    }

                    var description =
                        GetJsonString(
                            content,
                            "imageDescription"
                        );

                    sb.AppendLine(
                        "<figure>"
                    );

                    sb.AppendLine(
                        $"<img src=\"{EncodeAttribute(AbsoluteUrl(imageUrl, siteUrl))}\" "
                        + $"alt=\"{EncodeAttribute(alt)}\" loading=\"lazy\" />"
                    );

                    var captionText =
                        PlainText(
                            caption
                        );

                    if (!string.IsNullOrWhiteSpace(
                        captionText))
                    {
                        sb.AppendLine(
                            $"<figcaption>{Encode(captionText)}</figcaption>"
                        );
                    }

                    if (!string.IsNullOrWhiteSpace(
                        description))
                    {
                        sb.AppendLine(
                            $"<p>{Encode(description)}</p>"
                        );
                    }

                    sb.AppendLine(
                        "</figure>"
                    );

                    break;
                }

            case "ImageText":
                {
                    var imageUrl =
                        GetJsonString(
                            content,
                            "imageUrl"
                        );

                    var alt =
                        GetJsonString(
                            content,
                            "alt"
                        );

                    var title =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "titleHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "title"
                                )
                            )
                        );

                    var description =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "descriptionHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "description"
                                )
                            )
                        );

                    sb.AppendLine(
                        "<section>"
                    );

                    if (!string.IsNullOrWhiteSpace(
                        imageUrl))
                    {
                        sb.AppendLine(
                            $"<img src=\"{EncodeAttribute(AbsoluteUrl(imageUrl, siteUrl))}\" "
                            + $"alt=\"{EncodeAttribute(alt)}\" loading=\"lazy\" />"
                        );
                    }

                    if (!string.IsNullOrWhiteSpace(
                        title))
                    {
                        sb.AppendLine(
                            $"<h3>{Encode(title)}</h3>"
                        );
                    }

                    if (!string.IsNullOrWhiteSpace(
                        description))
                    {
                        sb.AppendLine(
                            $"<p>{Encode(description)}</p>"
                        );
                    }

                    sb.AppendLine(
                        "</section>"
                    );

                    break;
                }

            case "Quote":
                {
                    var quote =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "quoteHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "quote"
                                )
                            )
                        );

                    var author =
                        GetJsonString(
                            content,
                            "author"
                        );

                    if (!string.IsNullOrWhiteSpace(
                        quote))
                    {
                        sb.AppendLine(
                            "<blockquote>"
                        );

                        sb.AppendLine(
                            $"<p>{Encode(quote)}</p>"
                        );

                        if (!string.IsNullOrWhiteSpace(
                            author))
                        {
                            sb.AppendLine(
                                $"<cite>{Encode(author)}</cite>"
                            );
                        }

                        sb.AppendLine(
                            "</blockquote>"
                        );
                    }

                    break;
                }

            case "Callout":
                {
                    var title =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "titleHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "title"
                                )
                            )
                        );

                    var text =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "textHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "text"
                                )
                            )
                        );

                    sb.AppendLine(
                        "<aside>"
                    );

                    if (!string.IsNullOrWhiteSpace(
                        title))
                    {
                        sb.AppendLine(
                            $"<strong>{Encode(title)}</strong>"
                        );
                    }

                    if (!string.IsNullOrWhiteSpace(
                        text))
                    {
                        sb.AppendLine(
                            $"<p>{Encode(text)}</p>"
                        );
                    }

                    sb.AppendLine(
                        "</aside>"
                    );

                    break;
                }

            case "Button":
                {
                    var text =
                        PlainText(
                            FirstNonEmpty(
                                GetJsonString(
                                    content,
                                    "textHtml"
                                ),
                                GetJsonString(
                                    content,
                                    "text"
                                )
                            )
                        );

                    var url =
                        GetJsonString(
                            content,
                            "url"
                        );

                    if (!string.IsNullOrWhiteSpace(
                        url))
                    {
                        sb.AppendLine(
                            $"<p><a href=\"{EncodeAttribute(url)}\">"
                            + $"{Encode(string.IsNullOrWhiteSpace(text) ? "Xem thêm" : text)}"
                            + "</a></p>"
                        );
                    }

                    break;
                }

            case "Video":
                {
                    var title =
                        GetJsonString(
                            content,
                            "title"
                        );

                    var url =
                        GetJsonString(
                            content,
                            "url"
                        );

                    if (!string.IsNullOrWhiteSpace(
                        url))
                    {
                        sb.AppendLine(
                            $"<p><a href=\"{EncodeAttribute(url)}\">"
                            + $"{Encode(string.IsNullOrWhiteSpace(title) ? "Video" : title)}"
                            + "</a></p>"
                        );
                    }

                    break;
                }

            case "Divider":
                sb.AppendLine("<hr />");
                break;

            default:
                {
                    // Fallback: lấy text từ block lạ
                    // để Google vẫn đọc được nội dung.
                    var text =
                        ExtractAllText(
                            content
                        );

                    if (!string.IsNullOrWhiteSpace(
                        text))
                    {
                        sb.AppendLine(
                            $"<p>{Encode(text)}</p>"
                        );
                    }

                    break;
                }
        }
    }


    // =====================================================
    // NEWS LIST CONTENT
    // =====================================================

    private static string BuildNewsIndexContent(
        IReadOnlyList<NewsListItemResponse> articles,
        string siteUrl)
    {
        var sb =
            new StringBuilder();

        sb.AppendLine(
            "<main class=\"kj-seo-prerender\">"
        );

        sb.AppendLine(
            "<h1>Tin tức King Jades</h1>"
        );

        sb.AppendLine(
            "<p>Kiến thức về ngọc thiên nhiên, ngọc cẩm thạch, "
            + "ngọc phỉ thúy và trang sức King Jades.</p>"
        );

        sb.AppendLine(
            "<section>"
        );

        foreach (
            var article in articles)
        {
            var url =
                $"{siteUrl}/news/{article.Slug}";

            sb.AppendLine(
                "<article>"
            );

            sb.AppendLine(
                $"<h2><a href=\"{EncodeAttribute(url)}\">"
                + $"{Encode(article.Title)}</a></h2>"
            );

            if (!string.IsNullOrWhiteSpace(
                article.Summary))
            {
                sb.AppendLine(
                    $"<p>{Encode(article.Summary)}</p>"
                );
            }

            if (!string.IsNullOrWhiteSpace(
                article.CoverImageUrl))
            {
                sb.AppendLine(
                    $"<img src=\"{EncodeAttribute(AbsoluteUrl(article.CoverImageUrl, siteUrl))}\" "
                    + $"alt=\"{EncodeAttribute(article.Title)}\" loading=\"lazy\" />"
                );
            }

            sb.AppendLine(
                "</article>"
            );
        }

        sb.AppendLine(
            "</section>"
        );

        sb.AppendLine(
            "</main>"
        );

        return sb.ToString();
    }


    // =====================================================
    // SCHEMA
    // =====================================================

    private static string BuildArticleSchema(
        NewsArticleResponse article,
        string schemaType,
        string title,
        string description,
        string canonical,
        string ogImage)
    {
        var schema =
            new Dictionary<string, object?>
            {
                ["@context"] =
                    "https://schema.org",

                ["@type"] =
                    schemaType,

                ["headline"] =
                    article.Title,

                ["description"] =
                    description,

                ["mainEntityOfPage"] =
                    canonical,

                ["datePublished"] =
                    article.PublishedAtUtc,

                ["dateModified"] =
                    article.UpdatedAtUtc,

                ["author"] =
                    new Dictionary<string, object?>
                    {
                        ["@type"] =
                            "Person",

                        ["name"] =
                            string.IsNullOrWhiteSpace(
                                article.AuthorName
                            )
                                ? "King Jades"
                                : article.AuthorName
                    },

                ["publisher"] =
                    new Dictionary<string, object?>
                    {
                        ["@type"] =
                            "Organization",

                        ["name"] =
                            "King Jades"
                    }
            };

        if (!string.IsNullOrWhiteSpace(
            ogImage))
        {
            schema["image"] =
                new[] { ogImage };
        }

        if (
            article.CustomerRatingCount > 0
            &&
            article.CustomerRatingAverage > 0)
        {
            schema["aggregateRating"] =
                new Dictionary<string, object?>
                {
                    ["@type"] =
                        "AggregateRating",

                    ["ratingValue"] =
                        article.CustomerRatingAverage,

                    ["ratingCount"] =
                        article.CustomerRatingCount,

                    ["bestRating"] =
                        5,

                    ["worstRating"] =
                        1
                };
        }

        return JsonSerializer.Serialize(
            schema,
            new JsonSerializerOptions
            {
                PropertyNamingPolicy = null
            }
        );
    }


    private static string BuildNewsIndexSchema(
        string siteUrl,
        string title,
        string description)
    {
        var schema =
            new Dictionary<string, object?>
            {
                ["@context"] =
                    "https://schema.org",

                ["@type"] =
                    "CollectionPage",

                ["name"] =
                    title,

                ["description"] =
                    description,

                ["url"] =
                    $"{siteUrl}/news"
            };

        return JsonSerializer.Serialize(
            schema
        );
    }


    // =====================================================
    // FRONTEND INDEX PATH
    // =====================================================

    private string GetFrontendIndexPath()
    {
        var configured =
            _configuration[
                "Seo:FrontendIndexPath"
            ];

        if (!string.IsNullOrWhiteSpace(
            configured))
        {
            return configured;
        }

        return
            "/var/www/kingjades/frontend/index.html";
    }


    private string GetSiteUrl()
    {
        var configured =
            _configuration[
                "Seo:SiteUrl"
            ];

        if (!string.IsNullOrWhiteSpace(
            configured))
        {
            return configured.TrimEnd('/');
        }

        return DefaultSiteUrl;
    }


    // =====================================================
    // HELPERS
    // =====================================================

    private static string GetSeoString(
        object? seo,
        string propertyName)
    {
        if (seo == null)
        {
            return string.Empty;
        }

        try
        {
            var property =
                seo.GetType()
                    .GetProperty(
                        propertyName
                    );

            return property?
                    .GetValue(seo)?
                    .ToString()
                    ?.Trim()
                   ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }


    private static string GetJsonString(
        JsonElement element,
        string name)
    {
        if (
            element.ValueKind
                != JsonValueKind.Object)
        {
            return string.Empty;
        }

        if (
            !element.TryGetProperty(
                name,
                out var value))
        {
            return string.Empty;
        }

        return value.ValueKind switch
        {
            JsonValueKind.String =>
                value.GetString()
                ?? string.Empty,

            JsonValueKind.Number =>
                value.ToString(),

            JsonValueKind.True =>
                "true",

            JsonValueKind.False =>
                "false",

            _ =>
                value.ToString()
        };
    }


    private static int GetJsonInt(
        JsonElement element,
        string name,
        int fallback)
    {
        if (
            element.ValueKind
                != JsonValueKind.Object)
        {
            return fallback;
        }

        if (
            !element.TryGetProperty(
                name,
                out var value))
        {
            return fallback;
        }

        if (
            value.ValueKind
                == JsonValueKind.Number
            &&
            value.TryGetInt32(
                out var number))
        {
            return number;
        }

        if (
            int.TryParse(
                value.ToString(),
                out var parsed))
        {
            return parsed;
        }

        return fallback;
    }


    private static string PlainText(
        string? html)
    {
        if (string.IsNullOrWhiteSpace(
            html))
        {
            return string.Empty;
        }

        var withoutTags =
            Regex.Replace(
                html,
                "<[^>]+>",
                " ",
                RegexOptions.Singleline
            );

        var decoded =
            WebUtility.HtmlDecode(
                withoutTags
            );

        return Regex.Replace(
            decoded,
            @"\s+",
            " "
        ).Trim();
    }


    private static string ExtractAllText(
        JsonElement element)
    {
        var values =
            new List<string>();

        ExtractTextRecursive(
            element,
            values
        );

        return string.Join(
            " ",
            values
                .Select(PlainText)
                .Where(
                    x =>
                        !string.IsNullOrWhiteSpace(
                            x
                        )
                )
        );
    }


    private static void ExtractTextRecursive(
        JsonElement element,
        List<string> values)
    {
        switch (
            element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (
                    var property
                    in element
                        .EnumerateObject())
                {
                    ExtractTextRecursive(
                        property.Value,
                        values
                    );
                }

                break;

            case JsonValueKind.Array:
                foreach (
                    var item
                    in element
                        .EnumerateArray())
                {
                    ExtractTextRecursive(
                        item,
                        values
                    );
                }

                break;

            case JsonValueKind.String:
                var value =
                    element.GetString();

                if (!string.IsNullOrWhiteSpace(
                    value))
                {
                    values.Add(
                        value
                    );
                }

                break;
        }
    }


    private static string AbsoluteUrl(
        string? url,
        string siteUrl)
    {
        if (string.IsNullOrWhiteSpace(
            url))
        {
            return string.Empty;
        }

        url =
            url.Trim();

        if (
            Uri.TryCreate(
                url,
                UriKind.Absolute,
                out _))
        {
            return url;
        }

        if (!url.StartsWith('/'))
        {
            url =
                "/" + url;
        }

        return
            siteUrl.TrimEnd('/')
            + url;
    }


    private static string FirstNonEmpty(
        params string[] values)
    {
        return values.FirstOrDefault(
                   x =>
                       !string.IsNullOrWhiteSpace(
                           x
                       )
               )
               ?? string.Empty;
    }


    private static string Encode(
        string? value)
    {
        return HtmlEncoder.Default.Encode(
            value ?? string.Empty
        );
    }


    private static string EncodeAttribute(
        string? value)
    {
        return HtmlEncoder.Default.Encode(
            value ?? string.Empty
        );
    }


    private static string BuildSimple404Html(
        string slug)
    {
        return
            "<!doctype html>"
            + "<html lang=\"vi\">"
            + "<head>"
            + "<meta charset=\"utf-8\">"
            + "<meta name=\"robots\" content=\"noindex,follow\">"
            + "<title>Không tìm thấy bài viết | King Jades</title>"
            + "</head>"
            + "<body>"
            + "<main>"
            + "<h1>Không tìm thấy bài viết</h1>"
            + $"<p>{Encode(slug)}</p>"
            + "</main>"
            + "</body>"
            + "</html>";
    }
}