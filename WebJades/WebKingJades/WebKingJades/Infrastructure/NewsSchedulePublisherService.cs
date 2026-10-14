using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WebKingJades.Features.News.Repositories;
using WebKingJades.Services;


namespace WebKingJades.Features.News.Infrastructure;


public sealed class NewsSchedulePublisherService
    : BackgroundService
{

    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<NewsSchedulePublisherService> _logger;



    public NewsSchedulePublisherService(
        IServiceScopeFactory scopeFactory,
        ILogger<NewsSchedulePublisherService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }





    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {

        using var timer =
            new PeriodicTimer(
                TimeSpan.FromMinutes(1)
            );



        while (!stoppingToken.IsCancellationRequested)
        {

            try
            {

                using var scope =
                    _scopeFactory.CreateScope();



                var repository =
                    scope.ServiceProvider
                    .GetRequiredService<INewsRepository>();



                var notificationService =
                    scope.ServiceProvider
                    .GetRequiredService<INotificationService>();



                var published =
                    await repository.PublishDueScheduledAsync(
                        DateTime.UtcNow,
                        stoppingToken
                    );



                if (published > 0)
                {

                    await notificationService.CreateAsync(

                        "NEWS_SCHEDULED_PUBLISHED",

                        "Bài viết đã được xuất bản",

                        $"{published} bài viết đã tự động xuất bản.",

                        "/admin-dashboard",

                        new List<string>
                        {
                            "admin",
                            "staff"
                        },

                        "",

                        "System"

                    );



                    _logger.LogInformation(
                        "Đã tự động xuất bản {Count} bài News.",
                        published
                    );

                }

            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {

                _logger.LogError(
                    ex,
                    "Lỗi khi tự động xuất bản bài News."
                );

            }



            await timer.WaitForNextTickAsync(
                stoppingToken
            );

        }

    }

}