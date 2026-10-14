using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using WebKingJades.Data;
using WebKingJades.Models;

namespace WebKingJades.Services;

public class ProductPublishWorker : BackgroundService
{
    private readonly MongoDbContext _mongoContext;
    private readonly ILogger<ProductPublishWorker> _logger;
    private readonly TimeSpan _checkInterval;

    public ProductPublishWorker(
        MongoDbContext mongoContext,
        IConfiguration configuration,
        ILogger<ProductPublishWorker> logger
    )
    {
        _mongoContext = mongoContext;
        _logger = logger;

        var intervalSeconds =
            configuration.GetValue<int?>(
                "ProductPublishing:CheckIntervalSeconds"
            )
            ?? 30;

        // Tránh cấu hình quá thấp hoặc quá cao ngoài ý muốn.
        intervalSeconds =
            Math.Clamp(
                intervalSeconds,
                5,
                3600
            );

        _checkInterval =
            TimeSpan.FromSeconds(
                intervalSeconds
            );
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken
    )
    {
        _logger.LogInformation(
            "[ProductPublishWorker] Started. CheckInterval={CheckIntervalSeconds}s",
            _checkInterval.TotalSeconds
        );

        while (
            !stoppingToken.IsCancellationRequested
        )
        {
            try
            {
                await PublishDueProductsAsync(
                    stoppingToken
                );
            }
            catch (
                OperationCanceledException
            ) when (
                stoppingToken.IsCancellationRequested
            )
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "[ProductPublishWorker] Error while publishing scheduled products."
                );
            }

            try
            {
                await Task.Delay(
                    _checkInterval,
                    stoppingToken
                );
            }
            catch (
                OperationCanceledException
            ) when (
                stoppingToken.IsCancellationRequested
            )
            {
                break;
            }
        }

        _logger.LogInformation(
            "[ProductPublishWorker] Stopped."
        );
    }

    private async Task PublishDueProductsAsync(
        CancellationToken cancellationToken
    )
    {
        var nowUtc =
            DateTime.UtcNow;

        // Chỉ lấy sản phẩm:
        // 1. đang Scheduled
        // 2. có PublishAtUtc
        // 3. thời gian đăng <= hiện tại
        var filter =
            Builders<Product>
                .Filter
                .Eq(
                    x => x.PublishStatus,
                    "Scheduled"
                )
            &
            Builders<Product>
                .Filter
                .Ne(
                    x => x.PublishAtUtc,
                    null
                )
            &
            Builders<Product>
                .Filter
                .Lte(
                    x => x.PublishAtUtc,
                    nowUtc
                );

        var update =
            Builders<Product>
                .Update
                .Set(
                    x => x.PublishStatus,
                    "Published"
                )
                // Không tự bật Visibility.IsPublished.
                // Admin có thể bật/tắt hiển thị website độc lập.
                .Set(
                    x => x.PublishedAtUtc,
                    nowUtc
                )
                .Set(
                    x => x.UpdatedAtUtc,
                    nowUtc
                );

        var result =
            await _mongoContext
                .Products
                .UpdateManyAsync(
                    filter,
                    update,
                    cancellationToken:
                        cancellationToken
                );

        if (result.ModifiedCount > 0)
        {
            _logger.LogInformation(
                "[ProductPublishWorker] Auto published {Count} product(s) at {NowUtc}.",
                result.ModifiedCount,
                nowUtc
            );
        }
    }
}
