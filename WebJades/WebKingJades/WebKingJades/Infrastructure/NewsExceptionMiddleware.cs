using System.Net;
using System.Text.Json;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Infrastructure;

public sealed class NewsExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<NewsExceptionMiddleware> _logger;

    public NewsExceptionMiddleware(
        RequestDelegate next,
        ILogger<NewsExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NewsNotFoundException ex)
        {
            await WriteAsync(
                context,
                HttpStatusCode.NotFound,
                ex.Message);
        }
        catch (NewsConflictException ex)
        {
            await WriteAsync(
                context,
                HttpStatusCode.Conflict,
                ex.Message);
        }
        catch (NewsValidationException ex)
        {
            await WriteAsync(
                context,
                HttpStatusCode.BadRequest,
                ex.Message);
        }
        catch (ArgumentException ex)
        {
            await WriteAsync(
                context,
                HttpStatusCode.BadRequest,
                ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled News module error.");

            await WriteAsync(
                context,
                HttpStatusCode.InternalServerError,
                "Đã xảy ra lỗi hệ thống.");
        }
    }

    private static async Task WriteAsync(
        HttpContext context,
        HttpStatusCode statusCode,
        string message)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var body = JsonSerializer.Serialize(new
        {
            status = (int)statusCode,
            message
        });

        await context.Response.WriteAsync(body);
    }
}
