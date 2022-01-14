using System.ComponentModel;
using Microsoft.AspNetCore.Mvc;
using webFileSharingSystem.Core.Entities.Common;

namespace webFileSharingSystem.Web.Controllers;

public static class ActionExtensions
{
    public static ActionResult ToActionResult(this Result<OperationResult> operationResult, string errorMessage, string unauthorizedMessage = "You don't have permissions to perform this operation" )
    {
        switch (operationResult.Status)
        {
            case OperationResult.Ok:
                return new OkResult();
            case OperationResult.Unauthorized:
                return new UnauthorizedObjectResult(errorMessage);
            case OperationResult.BadRequest:
            case OperationResult.Exception:
                return new BadRequestObjectResult(errorMessage);
            default:
                throw new InvalidEnumArgumentException(nameof(operationResult.Status), (int)operationResult.Status, typeof(OperationResult));
        }
    }
}