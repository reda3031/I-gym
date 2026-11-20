<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpersonationLog extends Model
{
    protected $fillable = [
        'super_admin_id',
        'target_user_id',
        'start_time',
        'end_time',
        'ip_address',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function superAdmin()
    {
        return $this->belongsTo(User::class, 'super_admin_id');
    }

    public function targetUser()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
