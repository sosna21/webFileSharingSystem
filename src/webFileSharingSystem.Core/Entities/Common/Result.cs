using System;
using System.Collections.Generic;
using System.Linq;

namespace webFileSharingSystem.Core.Entities.Common
{
    public class Result
    {
        private Result(bool succeeded, IEnumerable<string> errors)
        {
            Succeeded = succeeded;
            Errors = errors.ToArray();
        }

        public bool Succeeded { get; }

        public string[] Errors { get; }

        public static Result Success()
        {
            return new Result(true, Array.Empty<string>());
        }

        public static Result Failure(IEnumerable<string> errors)
        {
            return new Result(false, errors);
        }
        
        public static Result Failure(params string[] errors)
        {
            return new Result(false, errors);
        }
        
        public static Result<T> Success<T>() where T : Enum
        {
            return Result<T>.Success();
        }

        public static Result<T> Success<T>(T status) where T : Enum
        {
            return Result<T>.Success(status);
        }
        
        public static Result<T> Failure<T>(T status, IEnumerable<string> errors) where T : Enum
        {
            return Result<T>.Failure(status, errors);
        }

        public static Result<T> Failure<T>( T status, params string[] errors) where T : Enum
        {
            return Result<T>.Failure(status, errors);
        }
    }
}