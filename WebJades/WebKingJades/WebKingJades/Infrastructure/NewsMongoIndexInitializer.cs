using Microsoft.Extensions.Hosting;
using MongoDB.Driver;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Infrastructure;

public sealed class NewsMongoIndexInitializer : IHostedService
{
    private readonly IMongoDatabase _database;

    public NewsMongoIndexInitializer(IMongoDatabase database)
    {
        _database = database;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var news = _database.GetCollection<NewsArticle>("NewsArticles");

        var newsIndexes = new[]
        {
            new CreateIndexModel<NewsArticle>(
                Builders<NewsArticle>.IndexKeys.Ascending(x => x.Slug),
                new CreateIndexOptions
                {
                    Unique = true,
                    Name = "ux_news_slug"
                }),

            new CreateIndexModel<NewsArticle>(
                Builders<NewsArticle>.IndexKeys
                    .Ascending(x => x.Status)
                    .Descending(x => x.PublishedAtUtc),
                new CreateIndexOptions
                {
                    Name = "ix_news_status_published"
                }),

            new CreateIndexModel<NewsArticle>(
                Builders<NewsArticle>.IndexKeys
                    .Ascending(x => x.ShowOnHomePage)
                    .Ascending(x => x.IsFeatured)
                    .Descending(x => x.PublishedAtUtc),
                new CreateIndexOptions
                {
                    Name = "ix_news_home_featured"
                }),

            new CreateIndexModel<NewsArticle>(
                Builders<NewsArticle>.IndexKeys
                    .Ascending(x => x.Status)
                    .Ascending(x => x.ScheduledAtUtc),
                new CreateIndexOptions
                {
                    Name = "ix_news_schedule"
                })
        };

        await news.Indexes.CreateManyAsync(
            newsIndexes,
            cancellationToken);

        var layouts = _database.GetCollection<NewsLayoutTemplate>(
            "NewsLayoutTemplates");

        await layouts.Indexes.CreateOneAsync(
            new CreateIndexModel<NewsLayoutTemplate>(
                Builders<NewsLayoutTemplate>.IndexKeys
                    .Ascending(x => x.IsDefault)
                    .Descending(x => x.UpdatedAtUtc),
                new CreateIndexOptions
                {
                    Name = "ix_news_layout_default"
                }),
            cancellationToken: cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
