﻿using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Specifications
{
    public sealed class GetAllFilesSpecs : BaseSpecification<File>
    {
        public GetAllFilesSpecs(int userId, int parentId) : base(
            e => e.UserId == userId
                 && e.IsDeleted == false &&
                 (parentId == -1 ? e.ParentId == null : e.ParentId == parentId))
        {
            AddInclude(file => file.PartialFileInfo);
            ApplyOrderBy(file => file.Id);
        }
    }
}