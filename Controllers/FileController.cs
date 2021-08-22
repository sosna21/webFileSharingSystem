using System;
using System.Collections.Generic;
using System.Linq;

using API.DTOs;

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class FileController : ControllerBase
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
            return Enumerable.Range(1, 5).Select(index => new FileDto
                {
                    
                    ModificationData = DateTime.Now.AddDays(index),
                    FileName = FileName[rng.Next(FileName.Length)],
                    Size = (ulong)rng.Next(0, 10000),
                    IsFavourite = Convert.ToBoolean( rng.Next(0, 1) ),
                    IsShared = Convert.ToBoolean( rng.Next(0, 1) )
                })
                .ToArray();
        }
    }
}