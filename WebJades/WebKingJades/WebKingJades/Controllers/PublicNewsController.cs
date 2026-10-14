using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/news")]
public sealed class PublicNewsController : ControllerBase
{
    private readonly INewsService _service;

    public PublicNewsController(INewsService service)
    {
        _service = service;
    }

    [HttpGet]
    public Task<PagedResult<NewsListItemResponse>> GetPage(
        [FromQuery] NewsQueryRequest query,
        CancellationToken cancellationToken)
    {
        return _service.GetPublicPageAsync(query, cancellationToken);
    }

    [HttpGet("featured")]
    public Task<IReadOnlyList<NewsListItemResponse>> GetFeatured(
        [FromQuery] int take = 4,
        CancellationToken cancellationToken = default)
    {
        return _service.GetFeaturedAsync(take, cancellationToken);
    }

    [HttpGet("latest")]
    public Task<IReadOnlyList<NewsListItemResponse>> GetLatest(
        [FromQuery] int take = 8,
        CancellationToken cancellationToken = default)
    {
        return _service.GetLatestAsync(take, cancellationToken);
    }

    [HttpGet("{slug}/rating")]
    public Task<NewsRatingResponse> GetRating(
        string slug,
        [FromQuery] string? visitorId = null,
        CancellationToken cancellationToken = default)
    {
        return _service.GetRatingAsync(
            slug,
            GetUserIdOrNull(),
            visitorId,
            cancellationToken);
    }

    [HttpPost("{slug}/rating")]
    public Task<NewsRatingResponse> SubmitRating(
        string slug,
        [FromBody] SubmitNewsRatingRequest request,
        CancellationToken cancellationToken = default)
    {
        return _service.SubmitRatingAsync(
            slug,
            request,
            GetUserIdOrNull(),
            cancellationToken);
    }

    [HttpGet("{slug}")]
    public Task<NewsArticleResponse> GetBySlug(
        string slug,
        [FromQuery] bool increaseView = true,
        CancellationToken cancellationToken = default)
    {
        return _service.GetPublicBySlugAsync(
            slug,
            increaseView,
            cancellationToken);
    }

    private string? GetUserIdOrNull()
    {
        if (User?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        return User.FindFirstValue(
                   ClaimTypes.NameIdentifier)
               ?? User.FindFirstValue("sub")
               ?? User.FindFirstValue("id");
    }
}
