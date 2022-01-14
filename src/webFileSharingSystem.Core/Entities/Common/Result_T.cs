using System;
using System.Collections.Generic;
using System.Linq;

namespace webFileSharingSystem.Core.Entities.Common
{
    public class Result<T>  where T : Enum
    {
        private Result(bool succeeded, T status, IEnumerable<string> errors)
        {
            Succeeded = succeeded;
            Status = status;
            Errors = errors.ToArray();
        }

        public bool Succeeded { get; }

        public T Status { get; }
        
        public string[] Errors { get; }
        
        public static Result<T> Success()
        {
            return new Result<T>(true, default, Array.Empty<string>());
        }

        public static Result<T> Success(T status)
        {
            return new Result<T>(true, status, Array.Empty<string>());
        }

        public static Result<T> Failure(T status, IEnumerable<string> errors)
        {
            return new Result<T>(false, status, errors);
        }

        public static Result<T> Failure(T status, params string[] errors)
        {
            return new Result<T>(false, status, errors.ToList());
        }
    }
}