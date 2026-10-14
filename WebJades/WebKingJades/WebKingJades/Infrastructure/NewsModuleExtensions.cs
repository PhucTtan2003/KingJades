using Microsoft.Extensions.DependencyInjection;
using WebKingJades.Features.News.Repositories;
using WebKingJades.Features.News.Services;

namespace WebKingJades.Features.News.Infrastructure;

public static class NewsModuleExtensions
{
    public static IServiceCollection AddNewsModule(
        this IServiceCollection services)
    {
        services.AddScoped<INewsRepository, MongoNewsRepository>();
        services.AddScoped<INewsLayoutRepository, MongoNewsLayoutRepository>();

        services.AddScoped<INewsService, NewsService>();
        services.AddScoped<INewsLayoutService, NewsLayoutService>();

        services.AddSingleton<INewsImageStorage, LocalNewsImageStorage>();

        services.AddHostedService<NewsMongoIndexInitializer>();
        services.AddHostedService<NewsSchedulePublisherService>();

        return services;
    }
}
