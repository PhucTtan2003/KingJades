using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Controllers;

[ApiController]
[Route("api/admin/news")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminNewsController : ControllerBase
{
    private readonly INewsService _service;

    public AdminNewsController(INewsService service)
    {
        _service = service;
    }

    // ======================================================
    // GET: /api/admin/news
    // ======================================================

    [HttpGet]
    public Task<PagedResult<NewsListItemResponse>> GetPage(
        [FromQuery] NewsQueryRequest query,
        CancellationToken cancellationToken)
    {
        return _service.GetAdminPageAsync(
            query,
            cancellationToken
        );
    }

    // ======================================================
    // GET: /api/admin/news/{id}
    // ======================================================

    [HttpGet("{id}")]
    public Task<NewsArticleResponse> GetById(
        string id,
        CancellationToken cancellationToken)
    {
        return _service.GetByIdAsync(
            id,
            cancellationToken
        );
    }

    // ======================================================
    // POST: /api/admin/news
    // ======================================================

    [HttpPost]
    public async Task<ActionResult<NewsArticleResponse>> Create(
        [FromBody] CreateNewsArticleRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(
            request,
            GetUserId(),
            GetUserName(),
            cancellationToken
        );

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = result.Id
            },
            result
        );
    }

    // ======================================================
    // PUT: /api/admin/news/{id}
    // ======================================================

    [HttpPut("{id}")]
    public Task<NewsArticleResponse> Update(
        string id,
        [FromBody] UpdateNewsArticleRequest request,
        CancellationToken cancellationToken)
    {
        return _service.UpdateAsync(
            id,
            request,
            cancellationToken
        );
    }

    // ======================================================
    // DELETE: /api/admin/news/{id}
    // ======================================================

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(
        string id,
        CancellationToken cancellationToken)
    {
        await _service.DeleteAsync(
            id,
            cancellationToken
        );

        return NoContent();
    }

    // ======================================================
    // POST: /api/admin/news/{id}/publish?version=1
    // ======================================================

    [HttpPost("{id}/publish")]
    public Task<NewsArticleResponse> Publish(
        string id,
        [FromQuery] int version,
        CancellationToken cancellationToken)
    {
        return _service.PublishAsync(
            id,
            version,
            cancellationToken
        );
    }

    // ======================================================
    // POST: /api/admin/news/{id}/unpublish?version=1
    // ======================================================

    [HttpPost("{id}/unpublish")]
    public Task<NewsArticleResponse> Unpublish(
        string id,
        [FromQuery] int version,
        CancellationToken cancellationToken)
    {
        return _service.UnpublishAsync(
            id,
            version,
            cancellationToken
        );
    }

    // ======================================================
    // POST: /api/admin/news/{id}/schedule?version=1
    // ======================================================

    [HttpPost("{id}/schedule")]
    public Task<NewsArticleResponse> Schedule(
        string id,
        [FromQuery] int version,
        [FromBody] ScheduleNewsRequest request,
        CancellationToken cancellationToken)
    {
        return _service.ScheduleAsync(
            id,
            version,
            request.ScheduledAtUtc,
            cancellationToken
        );
    }

    // ======================================================
    // POST: /api/admin/news/{id}/duplicate
    // ======================================================

    [HttpPost("{id}/duplicate")]
    public Task<NewsArticleResponse> Duplicate(
        string id,
        CancellationToken cancellationToken)
    {
        return _service.DuplicateAsync(
            id,
            GetUserId(),
            GetUserName(),
            cancellationToken
        );
    }

    // ======================================================
    // JWT CLAIM HELPERS
    // ======================================================

    private string GetUserId()
    {
        return
            User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId")
            ?? User.Identity?.Name
            ?? "admin";
    }

    private string GetUserName()
    {
        return
            User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("unique_name")
            ?? User.FindFirstValue("username")
            ?? User.FindFirstValue(ClaimTypes.Email)
            ?? "Admin";
    }
}