using System;
using System.Collections.Generic;
using System.Linq;
using webFileSharingSystem.Core.Entities;

namespace webFileSharingSystem.Core.Storage
{
    public static class StorageExtensions
    {
        public static void SetBit(this byte[] bytes, int bitIndex, bool value)
        {
            var byteIndex = bitIndex / 8;
            var bitInByteIndex = bitIndex % 8;

            var mask = (byte)(128 >> bitInByteIndex);

            if (value)
            {
                bytes[byteIndex] |= mask;
            }
            else
            {
                bytes[byteIndex] &= (byte)~mask;
            }
        }
        
        public static bool GetBit(this byte[] bytes, int bitIndex)
        {
            var byteIndex = bitIndex / 8;
            var bitInByteIndex = bitIndex % 8;

            var mask = (byte) (128 >> bitInByteIndex);

            return (bytes[byteIndex] & mask) != 0;
        }
        
        public static bool CheckIfAllBitsAreZeros(this byte[] bytes)
        {
            for (var i = 0; i < bytes.Length ; i ++)
            {
                if (bytes[i] != 0)
                {
                    return false;
                }
            }

            return true;
        }

        public static int[] GetAllIndexesWithValue(this byte[] bytes, bool value, 
            int minIndex = 0, int maxIndex = int.MaxValue)
        {
            if (minIndex > maxIndex)
            {
                return Array.Empty<int>();
            }

            var minByteIndex = minIndex / 8;
            var minBitInByteIndex = minIndex % 8;
            
            if (minByteIndex > bytes.Length - 1)
            {
                return Array.Empty<int>();
            }

            int maxByteIndex;
            int maxBitInByteIndex;
            if (maxIndex / 8 > bytes.Length - 1)
            {
                maxByteIndex = bytes.Length - 1;
                maxBitInByteIndex = 7;
            }
            else
            {
                maxByteIndex = maxIndex / 8;
                maxBitInByteIndex = maxIndex % 8;
            }

            var currentBitPosition = minBitInByteIndex;

            var result = new List<int>();
            
            for (var i = minByteIndex; i < maxByteIndex + 1; i++)
            {
                var startIndex = i * 8;
                
                if (currentBitPosition == 0 && (i < maxByteIndex || maxBitInByteIndex == 7))
                {
                    if (bytes[i] == 0x00)
                    {
                        if (!value)
                        {
                            result.AddRange(Enumerable.Range(startIndex, 8));
                        }
                        continue;
                    }
                    
                    if (bytes[i] == 0xFF)
                    {
                        if (value)
                        {
                            result.AddRange(Enumerable.Range(startIndex, 8));
                        }
                        continue;
                    }
                } 
                
                while (currentBitPosition < 8 && (i != maxByteIndex || currentBitPosition <= maxBitInByteIndex))
                {
                    var mask = (byte) (128 >> currentBitPosition);

                    if ((bytes[i] & mask) > 0 && value)
                    {
                        result.Add( startIndex + currentBitPosition );
                    }

                    if ((bytes[i] & mask) == 0 && !value)
                    {
                        result.Add( startIndex + currentBitPosition );
                    }

                    currentBitPosition++;
                }

                currentBitPosition = 0;
            }

            return result.ToArray();
        }

        public static PartialFileInfo GeneratePartialFileInfo(long fileSize, int preferredChunkSize = 512 * 1024)
        {
            var partialFileInfo = new PartialFileInfo
            {
                FileSize = fileSize
            };

            if (fileSize < preferredChunkSize)
            {
                partialFileInfo.ChunkSize = (int)fileSize;
            }
            else
            {
                partialFileInfo.ChunkSize = preferredChunkSize;
            }

            var numberOfChunks = (int)Math.Ceiling( (double)fileSize / preferredChunkSize);

            var numberOfBytes = (int)Math.Ceiling( (double)numberOfChunks / 8);

            // Persistence map initialization
            partialFileInfo.PersistenceMap = new byte[numberOfBytes];

            for (var i = 0 ; i < numberOfBytes; i++)
            {
                partialFileInfo.PersistenceMap[i] = byte.MaxValue;
            }

            var lastByteLeftOverBits = 8 - numberOfChunks % 8;
            
            var leftoverMask = (byte)0;
            for (var i = 0; i < lastByteLeftOverBits; i++)
            {
                leftoverMask |= (byte)(1 << i);
            }
            
            partialFileInfo.PersistenceMap[numberOfBytes - 1] &= (byte)~leftoverMask;

            return partialFileInfo;
        }
    }
}