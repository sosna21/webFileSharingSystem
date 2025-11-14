using System;
using System.Collections.Generic;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Infrastructure.Storage
{
    public static class StorageHelper
    {
        public static IEnumerable<File> FindRelativeFilePath( this File startFile, IDictionary<int, File> fileDictionary)
        {
            var currentFile = startFile;
            var visited = new HashSet<int>();
            while (visited.Add(currentFile.Id))
            {
                yield return currentFile;
                if (currentFile.ParentId is null || !fileDictionary.TryGetValue(currentFile.ParentId.Value, out currentFile))
                {
                    yield break;
                }
            }

            throw new Exception("loop detected");
        }
    }
}