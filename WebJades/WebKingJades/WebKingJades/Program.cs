using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using WebKingJades.Data;
using WebKingJades.Features.News.Infrastructure;
using WebKingJades.Models;
using WebKingJades.Services;
using WebKingJades.Settings;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using WebKingJades.Hubs;


var builder = WebApplication.CreateBuilder(args);

// ======================================================
// 0. REQUEST / MULTIPART UPLOAD LIMIT
// ======================================================
//
// Product Create/Update Controller đang giới hạn 120 MB.
// Ở tầng server để 150 MB nhằm chừa khoảng đệm cho:
// - multipart boundary
// - form fields JSON
// - headers
//
// Controller vẫn là lớp giới hạn cụ thể cho từng endpoint.
//

const long GlobalMaxRequestBodySize =
    150_000_000;

builder.WebHost.ConfigureKestrel(
    options =>
    {
        options.Limits.MaxRequestBodySize =
            GlobalMaxRequestBodySize;
    }
);

builder.Services.Configure<FormOptions>(
    options =>
    {
        options.MultipartBodyLengthLimit =
            GlobalMaxRequestBodySize;
    }
);

// ======================================================
// 1. CONTROLLERS + JSON
// ======================================================

builder.Services
    .AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy =
            JsonNamingPolicy.CamelCase;

        options.JsonSerializerOptions.DictionaryKeyPolicy =
            JsonNamingPolicy.CamelCase;

        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter()
        );
    });


// ======================================================
// 2. RESPONSE COMPRESSION
// ======================================================

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;

    options.MimeTypes =
        ResponseCompressionDefaults.MimeTypes.Concat(
            new[]
            {
                "application/json",
                "application/javascript",
                "text/css",
                "text/html",
                "text/plain"
            }
        );
});


// ======================================================
// 3. FORWARDED HEADERS - VPS / NGINX
// ======================================================
//
// Nginx thường terminate HTTPS và proxy request về Kestrel qua HTTP.
// Phần này giúp ASP.NET Core hiểu đúng:
// - IP client
// - scheme gốc là https
//
// Nginx cần gửi:
// proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
// proxy_set_header X-Forwarded-Proto $scheme;
//

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto;
});


// ======================================================
// 4. APP SETTINGS
// ======================================================

var frontendBaseUrl =
    builder.Configuration[
        "AppSettings:FrontendBaseUrl"
    ]?.TrimEnd('/');

var backendBaseUrl =
    builder.Configuration[
        "AppSettings:BackendBaseUrl"
    ]?.TrimEnd('/');

if (string.IsNullOrWhiteSpace(frontendBaseUrl))
{
    throw new InvalidOperationException(
        "AppSettings:FrontendBaseUrl chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(backendBaseUrl))
{
    throw new InvalidOperationException(
        "AppSettings:BackendBaseUrl chưa được cấu hình."
    );
}

Uri? configuredFrontendUri = null;

if (Uri.TryCreate(
        frontendBaseUrl,
        UriKind.Absolute,
        out var parsedFrontendUri))
{
    configuredFrontendUri =
        parsedFrontendUri;
}


// ======================================================
// 5. MONGODB SETTINGS
// ======================================================

builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection(
        "MongoDbSettings"
    )
);

builder.Services.AddSingleton<MongoDbContext>();

builder.Services.AddSingleton<IMongoDatabase>(
    serviceProvider =>
    {
        var mongoContext =
            serviceProvider
                .GetRequiredService<MongoDbContext>();

        return mongoContext.Database;
    }
);


// ======================================================
// 6. APPLICATION SERVICES
// ======================================================

builder.Services.AddSingleton<ProductService>();
builder.Services.AddSingleton<ProductCategoryService>();
builder.Services.AddScoped<ContactLeadService>();
builder.Services.AddSignalR();

// Chỉ đăng ký một lifetime, dùng chung với MongoDB singleton.
builder.Services.AddSingleton<INotificationService, NotificationService>();

// ======================================================
// 7. PRODUCT SCHEDULED PUBLISH WORKER
// ======================================================

builder.Services.AddHostedService<ProductPublishWorker>();


// ======================================================
// 8. EMAIL / SMTP SETTINGS
// ======================================================

builder.Services.Configure<MailSettings>(
    builder.Configuration.GetSection(
        "MailSettings"
    )
);

builder.Services.AddScoped<
    IEmailService,
    EmailService
>();

var mailSettings =
    builder.Configuration
        .GetSection("MailSettings")
        .Get<MailSettings>();

if (mailSettings == null)
{
    throw new InvalidOperationException(
        "MailSettings chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(
        mailSettings.Host))
{
    throw new InvalidOperationException(
        "MailSettings:Host chưa được cấu hình."
    );
}

if (mailSettings.Port <= 0)
{
    throw new InvalidOperationException(
        "MailSettings:Port chưa hợp lệ."
    );
}

if (string.IsNullOrWhiteSpace(
        mailSettings.SenderEmail))
{
    throw new InvalidOperationException(
        "MailSettings:SenderEmail chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(
        mailSettings.Username))
{
    throw new InvalidOperationException(
        "MailSettings:Username chưa được cấu hình."
    );
}

if (
    string.IsNullOrWhiteSpace(
        mailSettings.Password
    )
    ||
    mailSettings.Password.Trim()
        .Equals(
            "YOUR_GMAIL_APP_PASSWORD",
            StringComparison.OrdinalIgnoreCase
        )
)
{
    throw new InvalidOperationException(
        "MailSettings:Password chưa được cấu hình."
    );
}


// ======================================================
// 9. NEWS MODULE
// ======================================================

builder.Services.AddNewsModule();


// ======================================================
// 10. JWT SETTINGS
// ======================================================

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(
        "JwtSettings"
    )
);

var jwtSettings =
    builder.Configuration
        .GetSection("JwtSettings")
        .Get<JwtSettings>();

if (jwtSettings == null)
{
    throw new InvalidOperationException(
        "JwtSettings chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(
        jwtSettings.Secret))
{
    throw new InvalidOperationException(
        "JwtSettings:Secret chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(
        jwtSettings.Issuer))
{
    throw new InvalidOperationException(
        "JwtSettings:Issuer chưa được cấu hình."
    );
}

if (string.IsNullOrWhiteSpace(
        jwtSettings.Audience))
{
    throw new InvalidOperationException(
        "JwtSettings:Audience chưa được cấu hình."
    );
}

if (
    Encoding.UTF8.GetByteCount(
        jwtSettings.Secret
    ) < 32
)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret phải có độ dài tối thiểu 32 byte."
    );
}


// ======================================================
// 11. AUTHENTICATION - JWT
// ======================================================

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme =
            JwtBearerDefaults
                .AuthenticationScheme;

        options.DefaultChallengeScheme =
            JwtBearerDefaults
                .AuthenticationScheme;

        options.DefaultScheme =
            JwtBearerDefaults
                .AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        // HTTPS được terminate tại Nginx.
        // Không bắt JwtBearer tự kiểm tra metadata HTTPS.
        options.RequireHttpsMetadata = false;

        options.SaveToken = true;

        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer =
                    jwtSettings.Issuer,

                ValidAudience =
                    jwtSettings.Audience,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtSettings.Secret
                        )
                    ),

                ClockSkew =
                    TimeSpan.Zero,

                NameClaimType =
                    ClaimTypes.Name,

                RoleClaimType =
                    ClaimTypes.Role
            };

        options.Events =
            new JwtBearerEvents
            {

                OnMessageReceived = context =>
                {
                    // Chỉ cho phép nhận JWT từ query của kết nối SignalR.
                    // Không áp dụng cơ chế này cho API thông thường.
                    var path = context.HttpContext.Request.Path;

                    if (path.StartsWithSegments(
                            AdminNotificationHub.HubPath))
                    {
                        var accessToken =
                            context.Request.Query["access_token"].ToString();

                        if (!string.IsNullOrWhiteSpace(accessToken))
                        {
                            context.Token = accessToken;
                        }
                    }

                    return Task.CompletedTask;
                },

                OnChallenge =
                    async context =>
                    {
                        context.HandleResponse();

                        context.Response.StatusCode =
                            StatusCodes
                                .Status401Unauthorized;

                        context.Response.ContentType =
                            "application/json";

                        var response =
                            JsonSerializer.Serialize(
                                new
                                {
                                    status = 401,
                                    message =
                                        "Bạn chưa đăng nhập hoặc token đã hết hạn."
                                },
                                new JsonSerializerOptions
                                {
                                    PropertyNamingPolicy =
                                        JsonNamingPolicy
                                            .CamelCase
                                }
                            );

                        await context
                            .Response
                            .WriteAsync(
                                response
                            );
                    },

                OnForbidden =
                    async context =>
                    {
                        context.Response.StatusCode =
                            StatusCodes
                                .Status403Forbidden;

                        context.Response.ContentType =
                            "application/json";

                        var response =
                            JsonSerializer.Serialize(
                                new
                                {
                                    status = 403,
                                    message =
                                        "Bạn không có quyền thực hiện chức năng này."
                                },
                                new JsonSerializerOptions
                                {
                                    PropertyNamingPolicy =
                                        JsonNamingPolicy
                                            .CamelCase
                                }
                            );

                        await context
                            .Response
                            .WriteAsync(
                                response
                            );
                    }
            };
    });


// ======================================================
// 12. AUTHORIZATION
// ======================================================

builder.Services.AddAuthorization(
    options =>
    {
        options.AddPolicy(
            "AdminOnly",
            policy =>
            {
                policy
                    .RequireAuthenticatedUser();

                policy
                    .RequireRole(
                        "admin"
                    );
            }
        );

        options.AddPolicy(
            "StaffOrAdmin",
            policy =>
            {
                policy
                    .RequireAuthenticatedUser();

                policy
                    .RequireRole(
                        "admin",
                        "staff"
                    );
            }
        );
    }
);


// ======================================================
// 13. CORS
// ======================================================
//
// Theo cấu trúc temperature:
// - localhost / 127.0.0.1 / ::1: dùng khi dev
// - kingjades.com / www.kingjades.com: production
// - host trong AppSettings:FrontendBaseUrl
//
// JWT gửi qua Authorization header nên không cần AllowCredentials().
//

bool IsAllowedFrontendOrigin(
    string? origin)
{
    if (string.IsNullOrWhiteSpace(origin))
    {
        return false;
    }

    if (!Uri.TryCreate(
            origin,
            UriKind.Absolute,
            out var uri))
    {
        return false;
    }

    var isLocal =
        string.Equals(
            uri.Host,
            "localhost",
            StringComparison.OrdinalIgnoreCase
        )
        ||
        string.Equals(
            uri.Host,
            "127.0.0.1",
            StringComparison.OrdinalIgnoreCase
        )
        ||
        string.Equals(
            uri.Host,
            "::1",
            StringComparison.OrdinalIgnoreCase
        );

    var isProduction =
        string.Equals(
            uri.Host,
            "kingjades.com",
            StringComparison.OrdinalIgnoreCase
        )
        ||
        string.Equals(
            uri.Host,
            "www.kingjades.com",
            StringComparison.OrdinalIgnoreCase
        );

    var isConfiguredFrontend =
        configuredFrontendUri != null
        &&
        string.Equals(
            uri.Host,
            configuredFrontendUri.Host,
            StringComparison.OrdinalIgnoreCase
        );

    return
        isLocal ||
        isProduction ||
        isConfiguredFrontend;
}

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "ReactApp",
            policy =>
            {
                policy
                    .SetIsOriginAllowed(
                        IsAllowedFrontendOrigin
                    )
                    .AllowAnyMethod()
                    .AllowAnyHeader()
                    .WithExposedHeaders(
                        "Content-Disposition"
                    );
            }
        );
    }
);


// ======================================================
// 14. HTTP CONTEXT
// ======================================================

builder.Services.AddHttpContextAccessor();


// KING JADES - CONTACT RATE LIMIT
var contactLimitConfig = builder.Configuration
    .GetSection("RateLimiting:ContactLead");

var contactLimitEnabled =
    contactLimitConfig.GetValue("Enabled", true);

var contactPermitLimit =
    contactLimitConfig.GetValue("PermitLimit", 5);

var contactWindowSeconds =
    contactLimitConfig.GetValue("WindowSeconds", 60);

var contactSegments =
    contactLimitConfig.GetValue("SegmentsPerWindow", 6);

var contactQueueLimit =
    contactLimitConfig.GetValue("QueueLimit", 0);

if (contactPermitLimit < 1 ||
    contactWindowSeconds < 1 ||
    contactSegments < 1 ||
    contactSegments > contactWindowSeconds ||
    contactQueueLimit < 0)
{
    throw new InvalidOperationException(
        "RateLimiting:ContactLead chưa hợp lệ.");
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        var response = context.HttpContext.Response;

        response.StatusCode =
            StatusCodes.Status429TooManyRequests;

        if (context.Lease.TryGetMetadata(
            MetadataName.RetryAfter,
            out TimeSpan retryAfter))
        {
            response.Headers.RetryAfter =
                Math.Max(1, (int)Math.Ceiling(
                    retryAfter.TotalSeconds)).ToString();
        }

        await response.WriteAsJsonAsync(new
        {
            success = false,
            code = "CONTACT_RATE_LIMIT",
            message =
                "Bạn đã gửi quá nhiều yêu cầu. " +
                "Vui lòng thử lại sau."
        }, cancellationToken);
    };

    options.AddPolicy("ContactLead", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress;

        var clientKey = ip == null
            ? "unknown"
            : ip.IsIPv4MappedToIPv6
                ? ip.MapToIPv4().ToString()
                : ip.ToString();

        if (!contactLimitEnabled)
        {
            return RateLimitPartition.GetNoLimiter(clientKey);
        }

        return RateLimitPartition.GetSlidingWindowLimiter(
            clientKey,
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = contactPermitLimit,
                Window = TimeSpan.FromSeconds(
                    contactWindowSeconds),
                SegmentsPerWindow = contactSegments,
                QueueLimit = contactQueueLimit,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });
});

// ======================================================
// 15. BUILD APP
// ======================================================

var app = builder.Build();


// ======================================================
// 16. FORWARDED HEADERS
// ======================================================
//
// PHẢI đứng trước HTTPS redirection.
//

app.UseForwardedHeaders();


// ======================================================
// 17. CORS PREFLIGHT FALLBACK
// ======================================================
//
// Giống cách temperature xử lý OPTIONS.
// Hữu ích khi React gọi API qua Nginx/domain production.
//

app.Use(
    async (context, next) =>
    {
        var origin =
            context.Request.Headers
                .Origin
                .ToString();

        if (IsAllowedFrontendOrigin(
                origin))
        {
            context.Response.Headers[
                "Access-Control-Allow-Origin"
            ] = origin;

            context.Response.Headers[
                "Access-Control-Expose-Headers"
            ] = "Content-Disposition";

            context.Response.Headers[
                "Vary"
            ] = "Origin";

            if (HttpMethods.IsOptions(
                    context.Request.Method))
            {
                var requestedHeaders =
                    context.Request.Headers[
                        "Access-Control-Request-Headers"
                    ]
                    .ToString();

                var requestedMethod =
                    context.Request.Headers[
                        "Access-Control-Request-Method"
                    ]
                    .ToString();

                context.Response.Headers[
                    "Access-Control-Allow-Headers"
                ] =
                    string.IsNullOrWhiteSpace(
                        requestedHeaders
                    )
                        ? "Content-Type, Authorization, Cache-Control"
                        : requestedHeaders;

                context.Response.Headers[
                    "Access-Control-Allow-Methods"
                ] =
                    string.IsNullOrWhiteSpace(
                        requestedMethod
                    )
                        ? "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                        : requestedMethod;

                context.Response.Headers[
                    "Access-Control-Max-Age"
                ] = "600";

                context.Response.StatusCode =
                    StatusCodes
                        .Status204NoContent;

                return;
            }
        }

        await next();
    }
);


// ======================================================
// 18. CHECK MONGODB CONNECTION
// ======================================================

try
{
    var mongoContext =
        app.Services
            .GetRequiredService<
                MongoDbContext
            >();

    await mongoContext.Database
        .RunCommandAsync<
            MongoDB.Bson.BsonDocument
        >(
            new MongoDB.Bson.BsonDocument(
                "ping",
                1
            )
        );

    app.Logger.LogInformation(
        "[MongoDB] Connected successfully. Database={DatabaseName}",
        mongoContext.DatabaseName
    );
}
catch (Exception ex)
{
    app.Logger.LogCritical(
        ex,
        "[MongoDB] Không thể kết nối database."
    );

    throw;
}


// ======================================================
// 18A. CONTACT LEAD INDEXES - CREATE ONCE AT STARTUP
// ======================================================
// Không đặt CreateManyIndexes trong constructor scoped service:
// 100 khách gửi cùng lúc sẽ không còn chạy lại lệnh tạo index 100 lần.
using (var scope = app.Services.CreateScope())
{
    var contactLeadService = scope.ServiceProvider
        .GetRequiredService<ContactLeadService>();

    await contactLeadService.EnsureIndexesAsync();
}

// ======================================================
// 19. ENSURE WWWROOT / UPLOADS
// ======================================================

var webRootPath =
    app.Environment.WebRootPath;

if (string.IsNullOrWhiteSpace(
        webRootPath))
{
    webRootPath =
        Path.Combine(
            app.Environment.ContentRootPath,
            "wwwroot"
        );
}

Directory.CreateDirectory(
    webRootPath
);

Directory.CreateDirectory(
    Path.Combine(
        webRootPath,
        "uploads"
    )
);


// ======================================================
// 20. STARTUP LOG
// ======================================================

app.Logger.LogInformation(
    "[Environment] {EnvironmentName}",
    app.Environment.EnvironmentName
);

app.Logger.LogInformation(
    "[Frontend] FrontendBaseUrl={FrontendBaseUrl}",
    frontendBaseUrl
);

app.Logger.LogInformation(
    "[Backend] BackendBaseUrl={BackendBaseUrl}",
    backendBaseUrl
);

app.Logger.LogInformation(
    "[Uploads] Global request/multipart limit={UploadLimitMb} MB",
    GlobalMaxRequestBodySize / 1_000_000
);

app.Logger.LogInformation(
    "[Email] SMTP Host={Host}, Port={Port}, Sender={Sender}",
    mailSettings.Host,
    mailSettings.Port,
    mailSettings.SenderEmail
);

/*
 * KHÔNG log:
 * - MailSettings.Password
 * - JwtSettings.Secret
 * - MongoDB ConnectionString
 */


// ======================================================
// 21. ERROR HANDLING
// ======================================================

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(
        "/Home/Error"
    );

    if (
        Uri.TryCreate(
            backendBaseUrl,
            UriKind.Absolute,
            out var hstsBackendUri
        )
        &&
        hstsBackendUri.Scheme.Equals(
            Uri.UriSchemeHttps,
            StringComparison.OrdinalIgnoreCase
        )
    )
    {
        app.UseHsts();
    }
}

// ======================================================
// 22. NEWS EXCEPTION MIDDLEWARE
// ======================================================

app.UseMiddleware<
    NewsExceptionMiddleware
>();


// ======================================================
// 23. HTTPS
// ======================================================
//
// Khi chạy sau Nginx:
// request public = HTTPS
// Nginx proxy = HTTP localhost
//
// UseForwardedHeaders() phía trên sẽ giúp tránh redirect loop.
//
if (
    Uri.TryCreate(
        backendBaseUrl,
        UriKind.Absolute,
        out var backendUri
    )
    &&
    backendUri.Scheme.Equals(
        Uri.UriSchemeHttps,
        StringComparison.OrdinalIgnoreCase
    )
)
{
    app.UseHttpsRedirection();
}

// ======================================================
// 24. STATIC FILES
// ======================================================

app.UseStaticFiles();


// ======================================================
// 25. ROUTING
// ======================================================

app.UseRouting();


// ======================================================
// 26. CORS
// ======================================================

app.UseCors(
    "ReactApp"
);

app.UseRateLimiter();

// ======================================================
// 27. RESPONSE COMPRESSION
// ======================================================

app.UseResponseCompression();


// ======================================================
// 28. AUTHENTICATION / AUTHORIZATION
// ======================================================

app.UseAuthentication();
app.UseAuthorization();


// ======================================================
// 29. API CONTROLLERS
// ======================================================

app.MapControllers()
    .RequireCors(
        "ReactApp"
    );


// ======================================================
// 30. MVC ROUTE
// ======================================================

app.MapControllerRoute(
    name: "default",

    pattern:
        "{controller=Home}/{action=Index}/{id?}"
);


// ======================================================
// 31. DEBUG ROUTES - DEVELOPMENT ONLY
// ======================================================
//
// Không public các endpoint debug trên VPS.
//

if (app.Environment.IsDevelopment())
{
    app.MapGet(
        "/api/debug/routes",
        (
            IEnumerable<
                EndpointDataSource
            > sources
        ) =>
        {
            var routes =
                sources
                    .SelectMany(
                        source =>
                            source.Endpoints
                    )
                    .Select(
                        endpoint =>
                            endpoint.DisplayName
                    )
                    .Where(
                        name =>
                            !string.IsNullOrWhiteSpace(
                                name
                            )
                    )
                    .OrderBy(
                        name =>
                            name
                    )
                    .ToList();

            return Results.Ok(
                routes
            );
        }
    );

    app.MapGet(
        "/api/debug/product-controller",
        (
            ApplicationPartManager
                applicationPartManager
        ) =>
        {
            var feature =
                new ControllerFeature();

            applicationPartManager
                .PopulateFeature(
                    feature
                );

            var controllers =
                feature.Controllers
                    .Select(
                        x =>
                            new
                            {
                                x.Name,
                                FullName =
                                    x.FullName
                            }
                    )
                    .OrderBy(
                        x =>
                            x.Name
                    )
                    .ToList();

            var productType =
                typeof(
                    WebKingJades
                        .Controllers
                        .ProductsController
                );

            return Results.Ok(
                new
                {
                    productsControllerType =
                        new
                        {
                            productType.Name,
                            productType.FullName,
                            productType.IsPublic,
                            productType.IsAbstract,

                            baseType =
                                productType
                                    .BaseType
                                    ?.FullName,

                            isControllerBase =
                                typeof(
                                    Microsoft
                                        .AspNetCore
                                        .Mvc
                                        .ControllerBase
                                )
                                .IsAssignableFrom(
                                    productType
                                )
                        },

                    discoveredControllers =
                        controllers
                }
            );
        }
    );
}

app.MapHub<AdminNotificationHub>(
    AdminNotificationHub.HubPath
).RequireCors("ReactApp");
// ======================================================
// 32. RUN
// ======================================================

app.Run();


