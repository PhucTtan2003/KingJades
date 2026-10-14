using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WebKingJades.Data;
using WebKingJades.Dtos;
using WebKingJades.Models;
using WebKingJades.Settings;

namespace WebKingJades.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoginController : ControllerBase
    {
        private readonly MongoDbContext _context;
        private readonly JwtSettings _jwtSettings;

        // =========================================================
        // CONSTRUCTOR
        // =========================================================
        public LoginController(
            MongoDbContext context,
            IOptions<JwtSettings> jwtOptions)
        {
            _context = context;
            _jwtSettings = jwtOptions.Value;
        }

        // =========================================================
        // POST: api/login
        // =========================================================
        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequest request)
        {
            try
            {
                // =================================================
                // 1. VALIDATE INPUT
                // =================================================

                if (
                    string.IsNullOrWhiteSpace(
                        request.UsernameOrEmail
                    )
                    ||
                    string.IsNullOrWhiteSpace(
                        request.Password
                    )
                )
                {
                    return BadRequest(new
                    {
                        code =
                            "INVALID_INPUT",

                        message =
                            "Vui lòng nhập tài khoản và mật khẩu."
                    });
                }

                var input =
                    request.UsernameOrEmail
                        .Trim();

                /*
                 * Email trong database đang được
                 * lưu lowercase.
                 */
                var emailInput =
                    input.ToLowerInvariant();

                // =================================================
                // 2. FIND ACCOUNT
                //
                // QUAN TRỌNG:
                //
                // KHÔNG filter:
                // x.Status == "active"
                //
                // Vì user mới đăng ký:
                // status = inactive
                // isEmailVerified = false
                //
                // Ta cần tìm account trước để trả
                // EMAIL_NOT_VERIFIED chính xác.
                // =================================================

                var account =
                    await _context.Accounts
                        .Find(x =>
                            x.Username ==
                                input
                            ||
                            x.Email ==
                                emailInput
                        )
                        .FirstOrDefaultAsync();

                // =================================================
                // 3. ACCOUNT NOT FOUND
                // =================================================

                if (account == null)
                {
                    return Unauthorized(new
                    {
                        code =
                            "ACCOUNT_NOT_FOUND",

                        message =
                            "Tài khoản không tồn tại."
                    });
                }

                // =================================================
                // 4. CHECK PASSWORD
                // =================================================

                if (
                    account.Password !=
                    request.Password
                )
                {
                    return Unauthorized(new
                    {
                        code =
                            "INVALID_PASSWORD",

                        message =
                            "Mật khẩu không đúng."
                    });
                }

                // =================================================
                // 5. CHECK EMAIL VERIFICATION
                //
                // Chỉ áp dụng USER RoleId = 3.
                //
                // User public đăng ký:
                //
                // RoleId = 3
                // Status = inactive
                // IsEmailVerified = false
                //
                // => Không cho login.
                //
                // Sau verify:
                //
                // Status = active
                // IsEmailVerified = true
                //
                // => Login bình thường.
                // =================================================

                if (
                    account.RoleId == 3 &&
                    !account.IsEmailVerified
                )
                {
                    return Unauthorized(new
                    {
                        code =
                            "EMAIL_NOT_VERIFIED",

                        message =
                            "Email chưa được xác thực. Vui lòng kiểm tra Inbox hoặc Spam và nhấn liên kết xác thực."
                    });
                }

                // =================================================
                // 6. CHECK ACCOUNT STATUS
                //
                // Kiểm tra SAU email verification.
                //
                // Nhờ vậy user chưa verify sẽ nhận:
                // EMAIL_NOT_VERIFIED
                //
                // chứ không phải ACCOUNT_INACTIVE.
                // =================================================

                if (
                    !string.Equals(
                        account.Status,
                        "active",
                        StringComparison.OrdinalIgnoreCase
                    )
                )
                {
                    return Unauthorized(new
                    {
                        code =
                            "ACCOUNT_INACTIVE",

                        message =
                            "Tài khoản hiện đang bị khóa hoặc chưa được kích hoạt."
                    });
                }

                // =================================================
                // 7. CHECK ROLE
                // =================================================

                var role =
                    await _context.Roles
                        .Find(x =>
                            x.RoleId ==
                                account.RoleId
                            &&
                            x.Status ==
                                "active"
                        )
                        .FirstOrDefaultAsync();

                if (role == null)
                {
                    return Unauthorized(new
                    {
                        code =
                            "INVALID_ROLE",

                        message =
                            "Vai trò tài khoản không hợp lệ hoặc đã bị khóa."
                    });
                }

                // =================================================
                // 8. GENERATE JWT
                // =================================================

                var token =
                    GenerateJwtToken(
                        account.Id ?? "",
                        account.Username,
                        account.Email,
                        account.RoleId,
                        role.RoleName
                    );

                // =================================================
                // 9. LOGIN SUCCESS
                // =================================================

                return Ok(
                    new LoginResponse
                    {
                        Token =
                            token.Token,

                        ExpiresAt =
                            token.ExpiresAt,

                        AccountId =
                            account.Id ?? "",

                        Username =
                            account.Username,

                        Email =
                            account.Email,

                        RoleId =
                            account.RoleId,

                        RoleName =
                            role.RoleName
                    }
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    "[LOGIN ERROR]"
                );

                Console.WriteLine(
                    ex
                );

                return StatusCode(
                    StatusCodes
                        .Status500InternalServerError,
                    new
                    {
                        code =
                            "LOGIN_SERVER_ERROR",

                        message =
                            "Lỗi server khi đăng nhập."
                    }
                );
            }
        }

        // =========================================================
        // GET: api/login/me
        // =========================================================
        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            return Ok(new
            {
                accountId =
                    User.FindFirstValue(
                        ClaimTypes.NameIdentifier
                    ),

                username =
                    User.FindFirstValue(
                        ClaimTypes.Name
                    ),

                email =
                    User.FindFirstValue(
                        ClaimTypes.Email
                    ),

                roleId =
                    User.FindFirstValue(
                        "roleId"
                    ),

                roleName =
                    User.FindFirstValue(
                        ClaimTypes.Role
                    )
            });
        }

        // =========================================================
        // GENERATE JWT
        // =========================================================
        private (
            string Token,
            DateTime ExpiresAt
        ) GenerateJwtToken(
            string accountId,
            string username,
            string email,
            int roleId,
            string roleName)
        {
            var expiresAt =
                DateTime.UtcNow
                    .AddHours(
                        _jwtSettings
                            .ExpireHours
                    );

            var claims =
                new List<Claim>
                {
                    new Claim(
                        ClaimTypes.NameIdentifier,
                        accountId
                    ),

                    new Claim(
                        ClaimTypes.Name,
                        username
                    ),

                    new Claim(
                        ClaimTypes.Email,
                        email
                    ),

                    new Claim(
                        "roleId",
                        roleId.ToString()
                    ),

                    new Claim(
                        ClaimTypes.Role,
                        roleName
                    )
                };

            var key =
                new SymmetricSecurityKey(
                    Encoding.UTF8
                        .GetBytes(
                            _jwtSettings
                                .Secret
                        )
                );

            var credentials =
                new SigningCredentials(
                    key,
                    SecurityAlgorithms
                        .HmacSha256
                );

            var jwtToken =
                new JwtSecurityToken(
                    issuer:
                        _jwtSettings
                            .Issuer,

                    audience:
                        _jwtSettings
                            .Audience,

                    claims:
                        claims,

                    expires:
                        expiresAt,

                    signingCredentials:
                        credentials
                );

            var token =
                new JwtSecurityTokenHandler()
                    .WriteToken(
                        jwtToken
                    );

            return (
                token,
                expiresAt
            );
        }

        // =========================================================
        // DEBUG MONGODB
        //
        // CHỈ ADMIN ĐƯỢC XEM.
        //
        // Không trả Password ra API.
        // =========================================================
        [Authorize(Roles = "admin")]
        [HttpGet("debug-mongo")]
        public async Task<IActionResult> DebugMongo()
        {
            var accounts =
                await _context.Accounts
                    .Find(
                        Builders<Account>
                            .Filter
                            .Empty
                    )
                    .Limit(10)
                    .ToListAsync();

            var roles =
                await _context.Roles
                    .Find(
                        Builders<Role>
                            .Filter
                            .Empty
                    )
                    .Limit(10)
                    .ToListAsync();

            return Ok(new
            {
                databaseName =
                    _context.DatabaseName,

                totalAccounts =
                    accounts.Count,

                accounts =
                    accounts.Select(
                        x =>
                            new
                            {
                                x.Id,
                                x.Username,
                                x.Email,
                                x.Phone,

                                /*
                                 * Không expose password.
                                 */

                                x.RoleId,
                                x.Status,
                                x.IsEmailVerified,

                                hasVerificationToken =
                                    !string.IsNullOrWhiteSpace(
                                        x.EmailVerificationToken
                                    ),

                                x.EmailVerificationExpiresAtUtc
                            }
                    ),

                totalRoles =
                    roles.Count,

                roles =
                    roles.Select(
                        x =>
                            new
                            {
                                x.Id,
                                x.RoleId,
                                x.RoleName,
                                x.Status
                            }
                    )
            });
        }
    }
}