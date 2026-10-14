using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[AllowAnonymous]
public sealed class SeoHomeController : ControllerBase
{
    private const string DefaultSiteUrl =
        "https://kingjades.com";

    private readonly ProductService _productService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SeoHomeController> _logger;

    public SeoHomeController(
        ProductService productService,
        IConfiguration configuration,
        ILogger<SeoHomeController> logger)
    {
        _productService = productService;
        _configuration = configuration;
        _logger = logger;
    }

    /*
     * Nginx proxy request "/" vào endpoint này.
     *
     * Mục tiêu:
     * - giữ title / description / canonical / OG / schema
     * - vẫn có nội dung semantic cho môi trường không chạy JS
     * - KHÔNG nhét SSR fallback vào #root
     *
     * Nhờ vậy browser người dùng không còn nhìn thấy
     * trang HTML SEO thô trong lúc React đang boot.
     */
    [HttpGet("/seo/home")]
    [HttpHead("/seo/home")]
    public async Task<IActionResult> Home(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var siteUrl =
                GetSiteUrl();

            const string title =
                "King Jades | Trang sức ngọc thiên nhiên cao cấp";

            const string description =
                "King Jades tuyển chọn vòng ngọc và trang sức ngọc thiên nhiên cao cấp, tư vấn theo nhu cầu và sự tương hợp cá nhân.";

            var canonical =
                $"{siteUrl}/";

            var products =
                await _productService
                    .GetPublicProductsAsync(
                        new ProductQuery
                        {
                            Page = 1,
                            PageSize = 8,
                            Sort = "newest"
                        }
                    );

            var firstImage =
                products.Items
                    .Select(
                        x => x.MainImage
                    )
                    .FirstOrDefault(
                        x =>
                            !string.IsNullOrWhiteSpace(
                                x
                            )
                    );

            var ogImage =
                AbsoluteUrl(
                    firstImage,
                    siteUrl
                );

            var schemaJson =
                BuildSchema(
                    siteUrl,
                    description
                );

            var seoContent =
                BuildSeoContent(
                    products.Items,
                    siteUrl
                );

            var html =
                await BuildHtmlAsync(
                    title,
                    description,
                    canonical,
                    ogImage,
                    schemaJson,
                    seoContent,
                    cancellationToken
                );

            Response.Headers.CacheControl =
                "public,max-age=300";

            return Content(
                html,
                "text/html; charset=utf-8",
                Encoding.UTF8
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Cannot render SEO homepage."
            );

            return StatusCode(
                StatusCodes
                    .Status500InternalServerError
            );
        }
    }

    private async Task<string> BuildHtmlAsync(
        string title,
        string description,
        string canonical,
        string ogImage,
        string schemaJson,
        string seoContent,
        CancellationToken cancellationToken)
    {
        var indexPath =
            GetFrontendIndexPath();

        if (
            !System.IO.File.Exists(
                indexPath
            )
        )
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

        /*
         * Xóa SEO mặc định trong CRA index để tránh duplicate.
         */
        html =
            Regex.Replace(
                html,
                @"<title>.*?</title>",
                string.Empty,
                RegexOptions.IgnoreCase
                |
                RegexOptions.Singleline
            );

        html =
            RemoveMetaByName(
                html,
                "description"
            );

        html =
            RemoveMetaByName(
                html,
                "robots"
            );

        html =
            RemoveMetaByName(
                html,
                "keywords"
            );

        html =
            RemoveMetaByName(
                html,
                "twitter:card"
            );

        html =
            RemoveMetaByName(
                html,
                "twitter:title"
            );

        html =
            RemoveMetaByName(
                html,
                "twitter:description"
            );

        html =
            RemoveMetaByName(
                html,
                "twitter:image"
            );

        html =
            RemoveMetaByProperty(
                html,
                "og:type"
            );

        html =
            RemoveMetaByProperty(
                html,
                "og:title"
            );

        html =
            RemoveMetaByProperty(
                html,
                "og:description"
            );

        html =
            RemoveMetaByProperty(
                html,
                "og:url"
            );

        html =
            RemoveMetaByProperty(
                html,
                "og:image"
            );

        html =
            Regex.Replace(
                html,
                @"<link\s+rel=[""']canonical[""'][^>]*>",
                string.Empty,
                RegexOptions.IgnoreCase
                |
                RegexOptions.Singleline
            );

        var head =
            BuildHeadHtml(
                title,
                description,
                canonical,
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

        /*
         * ==================================================
         * FIX HOMEPAGE RELOAD FLASH
         * ==================================================
         *
         * CŨ:
         * seoContent được nhét trực tiếp vào:
         *
         * <div id="root"> ... SEO HTML ... </div>
         *
         * Browser sẽ paint phần HTML này trước.
         * Sau đó React createRoot() mới render HomePage.
         *
         * Khi JS/CSS tải chậm một chút, người dùng nhìn thấy:
         * "King Jades – Trang sức..."
         * "Giá trị King Jades"
         * "Sản phẩm ngọc nổi bật"
         *
         * rồi mới nhảy sang giao diện thật.
         *
         * MỚI:
         * - #root giữ RỖNG để React sở hữu hoàn toàn.
         * - seoContent chỉ nằm trong <noscript>.
         * - Browser có JavaScript => không render SEO fallback.
         * - Không JavaScript => vẫn có nội dung semantic.
         *
         * Không cần timer 4 giây.
         * Không cần script inline kj-js.
         * Không còn FOUC trang SEO thô.
         */

        var seoNoscript =
            $"<noscript>{seoContent}</noscript>";

        const string craNoscriptPattern =
            @"<noscript>\s*You need to enable JavaScript to run this app\.\s*</noscript>";

        if (
            Regex.IsMatch(
                html,
                craNoscriptPattern,
                RegexOptions.IgnoreCase
                |
                RegexOptions.Singleline
            )
        )
        {
            /*
             * Chỉ thay đúng noscript mặc định của CRA.
             * KHÔNG đụng GTM noscript.
             */
            html =
                Regex.Replace(
                    html,
                    craNoscriptPattern,
                    seoNoscript,
                    RegexOptions.IgnoreCase
                    |
                    RegexOptions.Singleline
                );
        }
        else
        {
            /*
             * Nếu build index sau này không còn câu CRA mặc định,
             * chèn noscript SEO ngay trước #root.
             */
            html =
                Regex.Replace(
                    html,
                    @"<div\s+id=[""']root[""']\s*>\s*</div>",
                    seoNoscript
                    +
                    Environment.NewLine
                    +
                    "<div id=\"root\"></div>",
                    RegexOptions.IgnoreCase
                    |
                    RegexOptions.Singleline
                );
        }

        /*
         * Safety:
         * Nếu một index build cũ đã bị nhét prerender vào #root,
         * đưa root về rỗng.
         */
        html =
            Regex.Replace(
                html,
                @"<div\s+id=[""']root[""']\s*>\s*<main\s+class=[""']kj-home-seo-prerender[""'][\s\S]*?</main>\s*</div>",
                "<div id=\"root\"></div>",
                RegexOptions.IgnoreCase
                |
                RegexOptions.Singleline
            );

        return html;
    }

    private static string BuildHeadHtml(
        string title,
        string description,
        string canonical,
        string ogImage,
        string schemaJson)
    {
        var sb =
            new StringBuilder();

        /*
         * Cố ý KHÔNG còn:
         *
         * document.documentElement.classList.add('kj-js')
         * setTimeout(..., 4000)
         * .kj-fallback-visible
         *
         * Đây chính là phần có thể gây SEO fallback xuất hiện
         * trong lúc React chưa boot xong.
         */

        sb.AppendLine(
            $"<title>{Encode(title)}</title>"
        );

        sb.AppendLine(
            $"<meta name=\"description\" content=\"{EncodeAttribute(description)}\" />"
        );

        sb.AppendLine(
            "<meta name=\"robots\" content=\"index,follow\" />"
        );

        sb.AppendLine(
            "<meta name=\"keywords\" content=\"King Jades, vòng ngọc thiên nhiên, trang sức ngọc, ngọc thiên nhiên, vòng tay ngọc\" />"
        );

        sb.AppendLine(
            $"<link rel=\"canonical\" href=\"{EncodeAttribute(canonical)}\" />"
        );

        sb.AppendLine(
            "<meta property=\"og:type\" content=\"website\" />"
        );

        sb.AppendLine(
            "<meta property=\"og:site_name\" content=\"King Jades\" />"
        );

        sb.AppendLine(
            "<meta property=\"og:locale\" content=\"vi_VN\" />"
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

        if (
            !string.IsNullOrWhiteSpace(
                ogImage
            )
        )
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

        if (
            !string.IsNullOrWhiteSpace(
                ogImage
            )
        )
        {
            sb.AppendLine(
                $"<meta name=\"twitter:image\" content=\"{EncodeAttribute(ogImage)}\" />"
            );
        }

        sb.AppendLine(
            "<script id=\"kingjades-home-seo-schema\" type=\"application/ld+json\">"
        );

        sb.AppendLine(
            schemaJson
        );

        sb.AppendLine(
            "</script>"
        );

        return sb.ToString();
    }

    private static string BuildSeoContent(
        IReadOnlyList<ProductListDto> products,
        string siteUrl)
    {
        var sb =
            new StringBuilder();

        sb.AppendLine(
            "<main class=\"kj-home-seo-prerender\">"
        );

        sb.AppendLine(
            "<section>"
        );

        sb.AppendLine(
            "<h1>King Jades – Trang sức ngọc thiên nhiên cao cấp</h1>"
        );

        sb.AppendLine(
            "<p>Trang sức ngọc thiên nhiên cao cấp, được tuyển chọn và tư vấn theo sự tương hợp cá nhân — để mỗi lựa chọn không chỉ đẹp, mà còn phù hợp với hành trình riêng.</p>"
        );

        sb.AppendLine(
            "<nav aria-label=\"Điều hướng King Jades\">"
        );

        sb.AppendLine(
            $"<a href=\"{EncodeAttribute(siteUrl + "/products")}\">Khám phá vòng ngọc thiên nhiên</a> "
        );

        sb.AppendLine(
            $"<a href=\"{EncodeAttribute(siteUrl + "/news")}\">Kiến thức ngọc</a> "
        );

        sb.AppendLine(
            $"<a href=\"{EncodeAttribute(siteUrl + "/cau-chuyen-thuong-hieu")}\">Câu chuyện thương hiệu</a> "
        );

        sb.AppendLine(
            $"<a href=\"{EncodeAttribute(siteUrl + "/xem-menh")}\">Xem ngọc hợp mệnh</a> "
        );

        sb.AppendLine(
            $"<a href=\"{EncodeAttribute(siteUrl + "/contact")}\">Liên hệ King Jades</a>"
        );

        sb.AppendLine(
            "</nav>"
        );

        sb.AppendLine(
            "</section>"
        );

        sb.AppendLine(
            "<section>"
        );

        sb.AppendLine(
            "<h2>Giá trị King Jades</h2>"
        );

        sb.AppendLine(
            "<h3>Chất lượng tinh tuyển</h3>"
        );

        sb.AppendLine(
            "<p>Mỗi phẩm ngọc được chọn theo chất ngọc, màu sắc, kết cấu và độ hoàn thiện để giữ giá trị lâu dài.</p>"
        );

        sb.AppendLine(
            "<h3>Tư vấn đúng người</h3>"
        );

        sb.AppendLine(
            "<p>King Jades ưu tiên trải nghiệm tư vấn 1:1 theo nhu cầu và câu chuyện riêng của từng khách hàng.</p>"
        );

        sb.AppendLine(
            "<h3>Giá trị truyền đời</h3>"
        );

        sb.AppendLine(
            "<p>Trang sức ngọc hướng đến giá trị thẩm mỹ, tinh thần và chiều sâu lâu dài thay vì xu hướng ngắn hạn.</p>"
        );

        sb.AppendLine(
            "</section>"
        );

        if (
            products.Count > 0
        )
        {
            sb.AppendLine(
                "<section>"
            );

            sb.AppendLine(
                "<h2>Sản phẩm ngọc nổi bật</h2>"
            );

            foreach (
                var product
                in products
            )
            {
                if (
                    string.IsNullOrWhiteSpace(
                        product.Slug
                    )
                )
                {
                    continue;
                }

                var productUrl =
                    $"{siteUrl}/products/{Uri.EscapeDataString(product.Slug)}";

                sb.AppendLine(
                    "<article>"
                );

                sb.AppendLine(
                    $"<h3><a href=\"{EncodeAttribute(productUrl)}\">{Encode(product.Name)}</a></h3>"
                );

                if (
                    !string.IsNullOrWhiteSpace(
                        product.MainImage
                    )
                )
                {
                    sb.AppendLine(
                        $"<img src=\"{EncodeAttribute(AbsoluteUrl(product.MainImage, siteUrl))}\" "
                        +
                        $"alt=\"{EncodeAttribute(product.Name)}\" loading=\"lazy\" />"
                    );
                }

                if (
                    !string.IsNullOrWhiteSpace(
                        product.ShortDescription
                    )
                )
                {
                    sb.AppendLine(
                        $"<p>{Encode(product.ShortDescription)}</p>"
                    );
                }

                sb.AppendLine(
                    "</article>"
                );
            }

            sb.AppendLine(
                "</section>"
            );
        }

        sb.AppendLine(
            "</main>"
        );

        return sb.ToString();
    }

    private static string BuildSchema(
        string siteUrl,
        string description)
    {
        var schema =
            new Dictionary<string, object?>
            {
                ["@context"] =
                    "https://schema.org",

                ["@graph"] =
                    new object[]
                    {
                        new Dictionary<string, object?>
                        {
                            ["@type"] =
                                "WebSite",

                            ["@id"] =
                                $"{siteUrl}/#website",

                            ["url"] =
                                $"{siteUrl}/",

                            ["name"] =
                                "King Jades",

                            ["description"] =
                                description,

                            ["inLanguage"] =
                                "vi-VN"
                        },

                        new Dictionary<string, object?>
                        {
                            ["@type"] =
                                "Organization",

                            ["@id"] =
                                $"{siteUrl}/#organization",

                            ["name"] =
                                "King Jades",

                            ["url"] =
                                $"{siteUrl}/",

                            ["description"] =
                                description
                        }
                    }
            };

        return JsonSerializer.Serialize(
            schema
        );
    }

    private string GetFrontendIndexPath()
    {
        var configured =
            _configuration[
                "Seo:FrontendIndexPath"
            ];

        if (
            !string.IsNullOrWhiteSpace(
                configured
            )
        )
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

        if (
            !string.IsNullOrWhiteSpace(
                configured
            )
        )
        {
            return configured.TrimEnd(
                '/'
            );
        }

        return DefaultSiteUrl;
    }

    private static string AbsoluteUrl(
        string? url,
        string siteUrl)
    {
        if (
            string.IsNullOrWhiteSpace(
                url
            )
        )
        {
            return string.Empty;
        }

        url =
            url.Trim();

        if (
            Uri.TryCreate(
                url,
                UriKind.Absolute,
                out var absoluteUri
            )
            &&
            (
                absoluteUri.Scheme
                    == Uri.UriSchemeHttp
                ||
                absoluteUri.Scheme
                    == Uri.UriSchemeHttps
            )
        )
        {
            return
                absoluteUri.ToString();
        }

        if (
            !url.StartsWith(
                '/'
            )
        )
        {
            url =
                "/"
                +
                url;
        }

        return
            siteUrl.TrimEnd(
                '/'
            )
            +
            url;
    }

    private static string RemoveMetaByName(
        string html,
        string name)
    {
        return Regex.Replace(
            html,
            $@"<meta\s+name=[""']{Regex.Escape(name)}[""'][^>]*>",
            string.Empty,
            RegexOptions.IgnoreCase
            |
            RegexOptions.Singleline
        );
    }

    private static string RemoveMetaByProperty(
        string html,
        string property)
    {
        return Regex.Replace(
            html,
            $@"<meta\s+property=[""']{Regex.Escape(property)}[""'][^>]*>",
            string.Empty,
            RegexOptions.IgnoreCase
            |
            RegexOptions.Singleline
        );
    }

    private static string Encode(
        string? value)
    {
        return HtmlEncoder
            .Default
            .Encode(
                value
                ??
                string.Empty
            );
    }

    private static string EncodeAttribute(
        string? value)
    {
        return HtmlEncoder
            .Default
            .Encode(
                value
                ??
                string.Empty
            );
    }
}
