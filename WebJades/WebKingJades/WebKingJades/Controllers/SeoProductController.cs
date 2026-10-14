using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Models;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[AllowAnonymous]
public sealed class SeoProductController : ControllerBase
{
    private const string DefaultSiteUrl = "https://kingjades.com";

    private readonly ProductService _productService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SeoProductController> _logger;

    public SeoProductController(
        ProductService productService,
        IConfiguration configuration,
        ILogger<SeoProductController> logger)
    {
        _productService = productService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("/products")]
    public async Task<IActionResult> ProductIndex(
        [FromQuery] int page = 1,
        [FromQuery] string? search = null,
        [FromQuery] string? parentCategoryId = null,
        [FromQuery] string? categoryId = null,
        [FromQuery] bool saleOnly = false,
        [FromQuery] string? sort = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = new ProductQuery
            {
                Page = Math.Max(page, 1),
                PageSize = 16,
                Search = search?.Trim() ?? string.Empty,
                ParentCategoryId = parentCategoryId?.Trim() ?? string.Empty,
                CategoryId = categoryId?.Trim() ?? string.Empty,
                SaleOnly = saleOnly,
                Sort = string.IsNullOrWhiteSpace(sort) ? "newest" : sort.Trim()
            };

            var result =
                await _productService.GetPublicProductsAsync(query);

            var siteUrl = GetSiteUrl();

            var title =
                "Trang sức ngọc thiên nhiên cao cấp | King Jades";

            var description =
                "Khám phá vòng ngọc, nhẫn ngọc, dây chuyền và trang sức ngọc thiên nhiên cao cấp tại King Jades.";

            var canonical =
                query.Page <= 1
                    ? $"{siteUrl}/products"
                    : $"{siteUrl}/products?page={query.Page}";

            var content =
                BuildProductIndexContent(
                    result.Items,
                    result.Total,
                    result.Page,
                    result.TotalPages,
                    siteUrl
                );

            var schema =
                BuildCollectionSchema(
                    title,
                    description,
                    canonical
                );

            var html =
                await BuildHtmlAsync(
                    title: title,
                    description: description,
                    canonical: canonical,
                    robots: "index,follow",
                    keywords: "trang sức ngọc, vòng ngọc, ngọc thiên nhiên, King Jades",
                    ogImage: string.Empty,
                    ogType: "website",
                    schemaJson: schema,
                    seoContent: content,
                    cancellationToken: cancellationToken
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
                "Cannot render SEO product index."
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError
            );
        }
    }

    [HttpGet("/products/{slug}")]
    public async Task<IActionResult> ProductDetail(
        string slug,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return NotFound(
                    BuildSimple404Html(slug ?? string.Empty)
                );
            }

            var product =
                await _productService.GetBySlugAsync(
                    slug.Trim()
                );

            if (
                product == null
                ||
                product.Visibility == null
                ||
                !product.Visibility.IsPublished
                ||
                !string.Equals(
                    product.PublishStatus,
                    "Published",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                Response.StatusCode =
                    StatusCodes.Status404NotFound;

                return Content(
                    BuildSimple404Html(slug),
                    "text/html; charset=utf-8"
                );
            }

            var siteUrl = GetSiteUrl();

            var seo = product.Seo ?? new ProductSeo();

            var title =
                !string.IsNullOrWhiteSpace(seo.Title)
                    ? seo.Title.Trim()
                    : $"{product.Name} | King Jades";

            var description =
                FirstNonEmpty(
                    seo.Description,
                    product.ShortDescription,
                    PlainText(product.Description),
                    product.Name
                );

            if (description.Length > 180)
            {
                description =
                    description[..177].TrimEnd()
                    + "...";
            }

            var keywords =
                BuildKeywords(
                    seo,
                    product
                );

            var robots =
                string.IsNullOrWhiteSpace(seo.Robots)
                    ? "index,follow"
                    : seo.Robots.Trim();

            /*
             * Chuẩn hóa canonical về route thật đang phục vụ sản phẩm.
             * Không dùng canonical cũ dạng /vong-ngoc-... vì frontend hiện tại
             * đang dùng /products/{slug}.
             */
            var canonical =
                $"{siteUrl}/products/{product.Slug}";

            var mainImage =
                GetMainImage(product);

            var ogImage =
                !string.IsNullOrWhiteSpace(seo.OgImage)
                    ? AbsoluteUrl(
                        seo.OgImage,
                        siteUrl
                    )
                    : mainImage == null
                        ? string.Empty
                        : AbsoluteUrl(
                            mainImage.Url,
                            siteUrl
                        );

            var schema =
                BuildProductSchema(
                    product,
                    title,
                    description,
                    canonical,
                    ogImage
                );

            var content =
                BuildProductDetailContent(
                    product,
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
                    ogType: "product",
                    schemaJson: schema,
                    seoContent: content,
                    cancellationToken: cancellationToken
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
                "Cannot render SEO product detail. Slug={Slug}",
                slug
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError
            );
        }
    }

    private async Task<string> BuildHtmlAsync(
        string title,
        string description,
        string canonical,
        string robots,
        string keywords,
        string ogImage,
        string ogType,
        string schemaJson,
        string seoContent,
        CancellationToken cancellationToken)
    {
        var indexPath =
            GetFrontendIndexPath();

        if (!System.IO.File.Exists(indexPath))
        {
            throw new FileNotFoundException(
                "Frontend index.html not found.",
                indexPath
            );
        }

        var html =
            await System.IO.File.ReadAllTextAsync(
                indexPath,
                cancellationToken
            );

        html =
            Regex.Replace(
                html,
                @"<title>.*?</title>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        html =
            Regex.Replace(
                html,
                @"<meta\s+name=[""']description[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        html =
            Regex.Replace(
                html,
                @"<meta\s+name=[""']robots[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

        html =
            Regex.Replace(
                html,
                @"<meta\s+name=[""']keywords[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                | RegexOptions.Singleline
            );

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
                ogType,
                schemaJson
            );

        html =
            Regex.Replace(
                html,
                @"</head>",
                head + "</head>",
                RegexOptions.IgnoreCase
            );

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
        string ogType,
        string schemaJson)
    {
        var sb = new StringBuilder();

        sb.AppendLine(
            $"<title>{Encode(title)}</title>"
        );

        sb.AppendLine(
            $"<meta name=\"description\" content=\"{EncodeAttribute(description)}\" />"
        );

        sb.AppendLine(
            $"<meta name=\"robots\" content=\"{EncodeAttribute(robots)}\" />"
        );

        if (!string.IsNullOrWhiteSpace(keywords))
        {
            sb.AppendLine(
                $"<meta name=\"keywords\" content=\"{EncodeAttribute(keywords)}\" />"
            );
        }

        sb.AppendLine(
            $"<link rel=\"canonical\" href=\"{EncodeAttribute(canonical)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:type\" content=\"{EncodeAttribute(ogType)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:title\" content=\"{EncodeAttribute(title)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:description\" content=\"{EncodeAttribute(description)}\" />"
        );

        sb.AppendLine(
            $"<meta property=\"og:url\" content=\"{EncodeAttribute(canonical)}\" />"
        );

        if (!string.IsNullOrWhiteSpace(ogImage))
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

        if (!string.IsNullOrWhiteSpace(ogImage))
        {
            sb.AppendLine(
                $"<meta name=\"twitter:image\" content=\"{EncodeAttribute(ogImage)}\" />"
            );
        }

        if (!string.IsNullOrWhiteSpace(schemaJson))
        {
            sb.AppendLine(
                "<script id=\"kingjades-product-seo-schema\" type=\"application/ld+json\">"
            );

            sb.AppendLine(schemaJson);

            sb.AppendLine("</script>");
        }

        return sb.ToString();
    }

    private static string BuildProductIndexContent(
        IReadOnlyList<ProductListDto> products,
        long total,
        int page,
        int totalPages,
        string siteUrl)
    {
        var sb = new StringBuilder();

        sb.AppendLine(
            "<main class=\"kj-seo-prerender\">"
        );

        sb.AppendLine(
            "<h1>Trang sức ngọc thiên nhiên King Jades</h1>"
        );

        sb.AppendLine(
            $"<p>Hiện có {total} sản phẩm ngọc thiên nhiên.</p>"
        );

        sb.AppendLine("<section>");

        foreach (var product in products)
        {
            var url =
                $"{siteUrl}/products/{product.Slug}";

            sb.AppendLine("<article>");

            sb.AppendLine(
                $"<h2><a href=\"{EncodeAttribute(url)}\">{Encode(product.Name)}</a></h2>"
            );

            if (!string.IsNullOrWhiteSpace(product.MainImage))
            {
                sb.AppendLine(
                    $"<img src=\"{EncodeAttribute(AbsoluteUrl(product.MainImage, siteUrl))}\" "
                    + $"alt=\"{EncodeAttribute(product.Name)}\" loading=\"lazy\" />"
                );
            }

            if (!string.IsNullOrWhiteSpace(product.Sku))
            {
                sb.AppendLine(
                    $"<p>SKU: {Encode(product.Sku)}</p>"
                );
            }

            if (!string.IsNullOrWhiteSpace(product.ShortDescription))
            {
                sb.AppendLine(
                    $"<p>{Encode(product.ShortDescription)}</p>"
                );
            }

            var finalPrice =
                product.SalePrice > 0
                    ? product.SalePrice
                    : product.Price;

            if (finalPrice > 0)
            {
                sb.AppendLine(
                    $"<p>Giá: {Encode(FormatPrice(finalPrice))}</p>"
                );
            }

            sb.AppendLine("</article>");
        }

        sb.AppendLine("</section>");

        if (totalPages > 1)
        {
            sb.AppendLine(
                $"<p>Trang {page} / {totalPages}</p>"
            );
        }

        sb.AppendLine("</main>");

        return sb.ToString();
    }

    private static string BuildProductDetailContent(
        Product product,
        string siteUrl)
    {
        var sb = new StringBuilder();

        sb.AppendLine(
            "<main class=\"kj-seo-prerender\">"
        );

        sb.AppendLine("<article>");

        sb.AppendLine(
            $"<h1>{Encode(product.Name)}</h1>"
        );

        if (!string.IsNullOrWhiteSpace(product.CategoryName))
        {
            sb.AppendLine(
                $"<p>Danh mục: {Encode(product.CategoryName)}</p>"
            );
        }

        if (!string.IsNullOrWhiteSpace(product.Sku))
        {
            sb.AppendLine(
                $"<p>SKU: {Encode(product.Sku)}</p>"
            );
        }

        var finalPrice =
            product.SalePrice > 0
                ? product.SalePrice
                : product.Price;

        if (finalPrice > 0)
        {
            sb.AppendLine(
                $"<p>Giá: {Encode(FormatPrice(finalPrice))}</p>"
            );
        }

        var mainImage =
            GetMainImage(product);

        if (mainImage != null)
        {
            sb.AppendLine("<figure>");

            sb.AppendLine(
                $"<img src=\"{EncodeAttribute(AbsoluteUrl(mainImage.Url, siteUrl))}\" "
                + $"alt=\"{EncodeAttribute(FirstNonEmpty(mainImage.Alt, product.Name))}\" "
                + $"title=\"{EncodeAttribute(FirstNonEmpty(mainImage.Title, product.Name))}\" />"
            );

            if (!string.IsNullOrWhiteSpace(mainImage.Caption))
            {
                sb.AppendLine(
                    $"<figcaption>{Encode(mainImage.Caption)}</figcaption>"
                );
            }

            sb.AppendLine("</figure>");
        }

        if (!string.IsNullOrWhiteSpace(product.ShortDescription))
        {
            sb.AppendLine(
                $"<p>{Encode(product.ShortDescription)}</p>"
            );
        }

        var description =
            PlainText(product.Description);

        if (!string.IsNullOrWhiteSpace(description))
        {
            sb.AppendLine("<section>");

            sb.AppendLine(
                "<h2>Mô tả sản phẩm</h2>"
            );

            sb.AppendLine(
                $"<p>{Encode(description)}</p>"
            );

            sb.AppendLine("</section>");
        }

        if (
            product.Specifications != null
            &&
            product.Specifications.Count > 0
        )
        {
            var validSpecifications =
                product.Specifications
                    .Where(
                        x =>
                            !string.IsNullOrWhiteSpace(x.Label)
                            &&
                            !string.IsNullOrWhiteSpace(x.Value)
                    )
                    .ToList();

            if (validSpecifications.Count > 0)
            {
                sb.AppendLine("<section>");

                sb.AppendLine(
                    "<h2>Thông số sản phẩm</h2>"
                );

                sb.AppendLine("<dl>");

                foreach (var spec in validSpecifications)
                {
                    sb.AppendLine(
                        $"<dt>{Encode(spec.Label)}</dt>"
                    );

                    sb.AppendLine(
                        $"<dd>{Encode(spec.Value)}</dd>"
                    );
                }

                sb.AppendLine("</dl>");
                sb.AppendLine("</section>");
            }
        }

        sb.AppendLine("</article>");
        sb.AppendLine("</main>");

        return sb.ToString();
    }

    private static string BuildProductSchema(
        Product product,
        string title,
        string description,
        string canonical,
        string ogImage)
    {
        var schemaType =
            !string.IsNullOrWhiteSpace(product.Seo?.SchemaType)
                ? product.Seo.SchemaType.Trim()
                : "Product";

        var schema =
            new Dictionary<string, object?>
            {
                ["@context"] =
                    "https://schema.org",

                ["@type"] =
                    schemaType,

                ["name"] =
                    product.Name,

                ["description"] =
                    description,

                ["sku"] =
                    string.IsNullOrWhiteSpace(product.Sku)
                        ? null
                        : product.Sku,

                ["category"] =
                    string.IsNullOrWhiteSpace(product.CategoryName)
                        ? null
                        : product.CategoryName,

                ["url"] =
                    canonical,

                ["brand"] =
                    new Dictionary<string, object?>
                    {
                        ["@type"] = "Brand",
                        ["name"] = "King Jades"
                    }
            };

        if (!string.IsNullOrWhiteSpace(ogImage))
        {
            schema["image"] =
                new[] { ogImage };
        }

        var finalPrice =
            product.SalePrice > 0
                ? product.SalePrice
                : product.Price;

        if (finalPrice > 0)
        {
            schema["offers"] =
                new Dictionary<string, object?>
                {
                    ["@type"] =
                        "Offer",

                    ["priceCurrency"] =
                        "VND",

                    ["price"] =
                        finalPrice,

                    ["url"] =
                        canonical
                };
        }

        return JsonSerializer.Serialize(
            schema,
            new JsonSerializerOptions
            {
                DefaultIgnoreCondition =
                    System.Text.Json.Serialization
                        .JsonIgnoreCondition
                        .WhenWritingNull
            }
        );
    }

    private static string BuildCollectionSchema(
        string title,
        string description,
        string canonical)
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
                    canonical
            };

        return JsonSerializer.Serialize(schema);
    }

    private static ProductImage? GetMainImage(
        Product product)
    {
        if (
            product.Images == null
            ||
            product.Images.Count == 0
        )
        {
            return null;
        }

        return product.Images
                   .OrderByDescending(x => x.IsMain)
                   .ThenBy(x => x.SortOrder)
                   .FirstOrDefault();
    }

    private static string BuildKeywords(
        ProductSeo seo,
        Product product)
    {
        var values =
            new List<string>();

        if (
            seo.Keywords != null
            &&
            seo.Keywords.Count > 0
        )
        {
            values.AddRange(
                seo.Keywords.Where(
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
            );
        }

        if (!string.IsNullOrWhiteSpace(seo.FocusKeyword))
        {
            values.Add(seo.FocusKeyword);
        }

        if (
            product.Tags != null
            &&
            product.Tags.Count > 0
        )
        {
            values.AddRange(
                product.Tags.Where(
                    x =>
                        !string.IsNullOrWhiteSpace(x)
                )
            );
        }

        return string.Join(
            ", ",
            values
                .Select(x => x.Trim())
                .Distinct(
                    StringComparer.OrdinalIgnoreCase
                )
        );
    }

    private string GetFrontendIndexPath()
    {
        var configured =
            _configuration[
                "Seo:FrontendIndexPath"
            ];

        if (!string.IsNullOrWhiteSpace(configured))
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

        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.TrimEnd('/');
        }

        return DefaultSiteUrl;
    }

    private static string AbsoluteUrl(
    string? url,
    string siteUrl)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return string.Empty;
        }

        url = url.Trim();

        // Chỉ coi HTTP/HTTPS là URL tuyệt đối thật sự.
        if (
            Uri.TryCreate(
                url,
                UriKind.Absolute,
                out var absoluteUri
            )
            &&
            (
                absoluteUri.Scheme == Uri.UriSchemeHttp
                ||
                absoluteUri.Scheme == Uri.UriSchemeHttps
            )
        )
        {
            return absoluteUri.ToString();
        }

        if (!url.StartsWith('/'))
        {
            url = "/" + url;
        }

        return
            siteUrl.TrimEnd('/')
            + url;
    }

    private static string PlainText(
        string? html)
    {
        if (string.IsNullOrWhiteSpace(html))
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

    private static string FirstNonEmpty(
        params string?[] values)
    {
        return values
                   .FirstOrDefault(
                       x =>
                           !string.IsNullOrWhiteSpace(x)
                   )
                   ?.Trim()
               ?? string.Empty;
    }

    private static string FormatPrice(
        decimal value)
    {
        return string.Format(
            System.Globalization
                .CultureInfo
                .GetCultureInfo("vi-VN"),
            "{0:N0} ₫",
            value
        );
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
            + "<title>Không tìm thấy sản phẩm | King Jades</title>"
            + "</head>"
            + "<body>"
            + "<main>"
            + "<h1>Không tìm thấy sản phẩm</h1>"
            + $"<p>{Encode(slug)}</p>"
            + "</main>"
            + "</body>"
            + "</html>";
    }
}
