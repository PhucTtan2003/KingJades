using System.Text;
using System.Xml.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Services;
using WebKingJades.Services;

namespace WebKingJades.Controllers;

[AllowAnonymous]
public sealed class SitemapController : ControllerBase
{
    private const string DefaultSiteUrl = "https://kingjades.com";

    private readonly ProductService _productService;
    private readonly INewsService _newsService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SitemapController> _logger;

    public SitemapController(
        ProductService productService,
        INewsService newsService,
        IConfiguration configuration,
        ILogger<SitemapController> logger)
    {
        _productService = productService;
        _newsService = newsService;
        _configuration = configuration;
        _logger = logger;
    }

    // =========================================================
    // GET /sitemap.xml
    // =========================================================
    [HttpGet("/sitemap.xml")]
    [HttpHead("/sitemap.xml")]
    public async Task<IActionResult> Sitemap(
        CancellationToken cancellationToken)
    {
        try
        {
            var siteUrl = GetSiteUrl();

            XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

            var urlset = new XElement(ns + "urlset");

            var addedUrls = new HashSet<string>(
                StringComparer.OrdinalIgnoreCase
            );

            void AddUrl(
                string absoluteUrl,
                DateTime? lastModifiedUtc = null)
            {
                if (string.IsNullOrWhiteSpace(absoluteUrl))
                {
                    return;
                }

                absoluteUrl = absoluteUrl.Trim();

                if (!addedUrls.Add(absoluteUrl))
                {
                    return;
                }

                var url = new XElement(
                    ns + "url",
                    new XElement(
                        ns + "loc",
                        absoluteUrl
                    )
                );

                if (lastModifiedUtc.HasValue)
                {
                    url.Add(
                        new XElement(
                            ns + "lastmod",
                            lastModifiedUtc
                                .Value
                                .ToUniversalTime()
                                .ToString("yyyy-MM-dd")
                        )
                    );
                }

                urlset.Add(url);
            }

            // =================================================
            // STATIC / IMPORTANT PUBLIC URLS
            // =================================================

            AddUrl($"{siteUrl}/");
            AddUrl($"{siteUrl}/products");
            AddUrl($"{siteUrl}/news");
            AddUrl($"{siteUrl}/cau-chuyen-thuong-hieu");
            AddUrl($"{siteUrl}/contact");
            AddUrl($"{siteUrl}/xem-menh");

            // =================================================
            // PRODUCTS
            //
            // ProductQuery hiện clamp PageSize tối đa 60.
            // Vì vậy loop từng trang cho đến khi hết dữ liệu.
            // =================================================

            const int productPageSize = 60;
            var productPage = 1;

            while (true)
            {
                var productQuery = new ProductQuery
                {
                    Page = productPage,
                    PageSize = productPageSize,
                    Sort = "newest"
                };

                var productResult =
                    await _productService
                        .GetPublicProductsAsync(
                            productQuery
                        );

                foreach (var product in productResult.Items)
                {
                    if (string.IsNullOrWhiteSpace(product.Slug))
                    {
                        continue;
                    }

                    /*
                     * ProductListDto hiện có CreatedAtUtc nhưng
                     * không có UpdatedAtUtc.
                     *
                     * Không xuất lastmod sai lệch.
                     * Chỉ xuất canonical URL sản phẩm.
                     */
                    AddUrl(
                        $"{siteUrl}/products/{Uri.EscapeDataString(product.Slug)}"
                    );
                }

                if (
                    productResult.Items.Count == 0
                    ||
                    !productResult.HasNextPage
                )
                {
                    break;
                }

                productPage++;

                // Safety guard.
                if (productPage > 1000)
                {
                    break;
                }
            }

            // =================================================
            // NEWS
            //
            // NewsQueryRequest hỗ trợ PageSize tối đa 100.
            // NewsListItemResponse có UpdatedAtUtc nên dùng lastmod.
            // =================================================

            const int newsPageSize = 100;
            var newsPage = 1;

            while (true)
            {
                var newsQuery =
                    new NewsQueryRequest
                    {
                        Page = newsPage,
                        PageSize = newsPageSize
                    };

                var newsResult =
                    await _newsService
                        .GetPublicPageAsync(
                            newsQuery,
                            cancellationToken
                        );

                foreach (var article in newsResult.Items)
                {
                    if (string.IsNullOrWhiteSpace(article.Slug))
                    {
                        continue;
                    }

                    AddUrl(
                        $"{siteUrl}/news/{Uri.EscapeDataString(article.Slug)}",
                        article.UpdatedAtUtc
                    );
                }

                if (
                    newsResult.Items.Count == 0
                    ||
                    newsPage >= newsResult.TotalPages
                )
                {
                    break;
                }

                newsPage++;

                // Safety guard.
                if (newsPage > 1000)
                {
                    break;
                }
            }

            var document =
                new XDocument(urlset);

            var xml =
                "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
                + document.ToString(
                    SaveOptions.DisableFormatting
                );

            Response.Headers.CacheControl =
                "public,max-age=1800";

            return Content(
                xml,
                "application/xml; charset=utf-8",
                Encoding.UTF8
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Cannot generate sitemap.xml."
            );

            return StatusCode(
                StatusCodes.Status500InternalServerError
            );
        }
    }

    // =========================================================
    // GET /robots.txt
    [HttpGet("/robots.txt")]
    [HttpHead("/robots.txt")]
    public IActionResult Robots()
    {
        var siteUrl = GetSiteUrl();

        var content =
            $"""
            User-agent: *
            Allow: /

            Disallow: /api/
            Disallow: /admin/
            Disallow: /admin-dashboard
            Disallow: /staff
            Disallow: /user
            Disallow: /login
            Disallow: /register
            Disallow: /register-success
            Disallow: /verify-email
            Disallow: /cart

            Sitemap: {siteUrl}/sitemap.xml
            """;

        Response.Headers.CacheControl =
            "public,max-age=3600";

        return Content(
            content.Trim() + "\n",
            "text/plain; charset=utf-8",
            Encoding.UTF8
        );
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
}
