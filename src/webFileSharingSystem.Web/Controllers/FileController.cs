using System;
using System.Collections.Generic;
using System.Linq;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

using webFileSharingSystem.Web.DTOs;

namespace webFileSharingSystem.Web.Controllers
{
    public class FileController : BaseController
    {
        private static readonly string[] FileName = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<FileController> _logger;

        public FileController(ILogger<FileController> logger)
        {
            _logger = logger;
        }

        [HttpGet]
        public IEnumerable<FileDto> Get()
        {
            var rng = new Random();
            return Enumerable.Range(1, 40).Select(index => new FileDto
                {
                    Id = index,
                    ModificationData = DateTime.Now.AddDays(rng.Next(0,21)),
                    FileName = FileName[rng.Next(FileName.Length)],
                    Size = (ulong)rng.Next(100, 1000000000),
                    IsFavourite = Convert.ToBoolean( rng.Next(0, 2) ),
                    IsShared = Convert.ToBoolean( rng.Next(0, 2) )
                })
                .ToArray();
        }
    }
}