using System;
using System.Collections.Generic;
using System.Reflection;
using webFileSharingSystem.Core.Services;
using Xunit;

namespace webFileSharingSystem.UnitTests.Services
{
    public class FileNameUniquenessHelperTests
    {
        [Fact]
        public void GetUniqueName_WhenNameNotPresent_ReturnsOriginal()
        {
            var existingNames = new HashSet<string>();

            var result = InvokeUniqueName(existingNames, "doc.txt");

            Assert.Equal("doc.txt", result);
            Assert.Contains("doc.txt", existingNames);
        }

        [Fact]
        public void GetUniqueName_WhenNameExists_AddsCounterSuffix()
        {
            var existingNames = new HashSet<string>
            {
                "doc.txt",
                "doc (1).txt"
            };

            var result = InvokeUniqueName(existingNames, "doc.txt");

            Assert.Equal("doc (2).txt", result);
            Assert.Contains("doc (2).txt", existingNames);
        }

        [Fact]
        public void GetUniqueCopyName_WhenNoConflict_UsesOriginalName()
        {
            var existingNames = new HashSet<string>();

            var result = InvokeUniqueCopyName(existingNames, "notes.txt");

            Assert.Equal("notes.txt", result);
            Assert.Contains("notes.txt", existingNames);
        }

        [Fact]
        public void GetUniqueCopyName_WhenNameExists_UsesCopySuffix()
        {
            var existingNames = new HashSet<string>
            {
                "notes.txt"
            };

            var result = InvokeUniqueCopyName(existingNames, "notes.txt");

            Assert.Equal("notes - Copy.txt", result);
            Assert.Contains("notes - Copy.txt", existingNames);
        }

        [Fact]
        public void GetUniqueCopyName_WhenCopyExists_UsesIncrementedSuffix()
        {
            var existingNames = new HashSet<string>
            {
                "notes.txt",
                "notes - Copy.txt",
                "notes - Copy(2).txt"
            };

            var result = InvokeUniqueCopyName(existingNames, "notes.txt");

            Assert.Equal("notes - Copy(3).txt", result);
            Assert.Contains("notes - Copy(3).txt", existingNames);
        }

        private static string InvokeUniqueName(HashSet<string> existingNames, string fileName)
        {
            return InvokeHelper("GetUniqueName", existingNames, fileName);
        }

        private static string InvokeUniqueCopyName(HashSet<string> existingNames, string fileName)
        {
            return InvokeHelper("GetUniqueCopyName", existingNames, fileName);
        }

        private static string InvokeHelper(string methodName, HashSet<string> existingNames, string fileName)
        {
            var helperType = typeof(FileService).Assembly.GetType(
                "webFileSharingSystem.Core.Services.FileNameUniquenessHelper",
                throwOnError: true);
            var method = helperType!.GetMethod(
                methodName,
                BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic,
                binder: null,
                types: new[] { typeof(HashSet<string>), typeof(string) },
                modifiers: null);

            if (method is null)
                throw new InvalidOperationException($"Method not found: {methodName}");

            return (string)method.Invoke(null, new object?[] { existingNames, fileName })!;
        }
    }
}
