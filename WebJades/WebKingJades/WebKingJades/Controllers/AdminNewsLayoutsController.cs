using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Controllers;

[ApiController]
[Route("api/admin/news-layouts")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminNewsLayoutController : ControllerBase
{
    private readonly INewsLayoutService _service;

    public AdminNewsLayoutController(
        INewsLayoutService service)
    {
        _service = service;
    }

    // GET: /api/admin/news-layouts
    [HttpGet]
    public Task<IReadOnlyList<NewsLayoutResponse>> GetAll(
        CancellationToken cancellationToken)
    {
        return _service.GetAllAsync(
            cancellationToken
        );
    }

    // GET: /api/admin/news-layouts/{id}
    [HttpGet("{id}")]
    public Task<NewsLayoutResponse> GetById(
        string id,
        CancellationToken cancellationToken)
    {
        return _service.GetByIdAsync(
            id,
            cancellationToken
        );
    }

    // POST: /api/admin/news-layouts
    [HttpPost]
    public async Task<ActionResult<NewsLayoutResponse>> Create(
        [FromBody] CreateNewsLayoutRequest request,
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

    // PUT: /api/admin/news-layouts/{id}
    [HttpPut("{id}")]
    public Task<NewsLayoutResponse> Update(
        string id,
        [FromBody] UpdateNewsLayoutRequest request,
        CancellationToken cancellationToken)
    {
        return _service.UpdateAsync(
            id,
            request,
            cancellationToken
        );
    }

    // DELETE: /api/admin/news-layouts/{id}
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

    private string GetUserId()
    {
        return
            User.FindFirstValue(
                ClaimTypes.NameIdentifier
            )
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("userId")
            ?? "admin";
    }

    private string GetUserName()
    {
        return
            User.FindFirstValue(
                ClaimTypes.Name
            )
            ?? User.FindFirstValue("unique_name")
            ?? User.FindFirstValue("username")
            ?? User.FindFirstValue(
                ClaimTypes.Email
            )
            ?? "Admin";
    }
}