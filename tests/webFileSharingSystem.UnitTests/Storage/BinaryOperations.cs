using System;
using System.Collections.Generic;
using System.Linq;
using webFileSharingSystem.Core.Storage;
using Xunit;

namespace webFileSharingSystem.UnitTests.Storage
{
    public class BinaryOperations
    {

        [Fact]
        public void ByteArraySetBits()
        {
            var byteArray = new byte[] {0, 0, 0};
            
            byteArray.SetBit(0, true);
            byteArray.SetBit(4, true);
            byteArray.SetBit(7, true);
            byteArray.SetBit(19, true);
            byteArray.SetBit(22, true);
            byteArray.SetBit(23, true);

            var expectedArray = new byte[] {0x89, 0, 0x13};

            Assert.Equal(expectedArray, byteArray);
            
            byteArray.SetBit(0, false);
            byteArray.SetBit(4, false);
            byteArray.SetBit(7, false);
            byteArray.SetBit(19, false);
            byteArray.SetBit(22, false);
            byteArray.SetBit(23, false);
            
            expectedArray = new byte[] {0, 0, 0};
            
            Assert.Equal(expectedArray, byteArray);
            
            Assert.True( byteArray.CheckIfAllBitsAreZeros() );
        }

        [Fact]
        public void ByteArrayGetIndexes()
        {
            var byteArray = new byte[] {0x89, 0, 0x13, 0xFF, 0x81};

            Assert.Equal(new[] {0}, byteArray.GetAllIndexesWithValue(true, 0, 0));
            
            var expectedIndexes = new List<int> {0, 4, 7, 19, 22, 23};
            var onlyOnes = Enumerable.Range(24, 8);
            expectedIndexes.AddRange( onlyOnes.Concat( new []{ 32, 39} ) );

            Assert.Equal(expectedIndexes.ToArray(), byteArray.GetAllIndexesWithValue(true));

            expectedIndexes.Remove(0);
            expectedIndexes.Remove(39);
            
            Assert.Equal(expectedIndexes.ToArray(), byteArray.GetAllIndexesWithValue(true, 4, 38));
            
            Assert.Equal(Array.Empty<int>(), byteArray.GetAllIndexesWithValue(false, 24, 32));

            Assert.Equal(new[] {33, 34, 35, 36, 37, 38}, byteArray.GetAllIndexesWithValue(false, 24));

        }
    
    }
}