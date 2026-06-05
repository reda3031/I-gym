<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Alert extends Model
{
    use HasFactory;

    protected $fillable = ['type', 'message', 'room_id', 'is_read'];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
