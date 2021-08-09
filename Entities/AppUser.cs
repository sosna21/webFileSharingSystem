using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API.Entities
{
    public class AppUser
    {
        [Key]
        public int Id { get; set; }
        
        [Column(TypeName = "nvarchar(255)")]
        public string UserName { get; set;}
    }
}