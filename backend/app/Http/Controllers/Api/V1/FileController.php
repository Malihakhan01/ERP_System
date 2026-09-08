<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:20480', // 20MB max
            'document_type' => 'required|string|max:50',
            'entity_type' => 'required|string|max:100',
            'entity_id' => 'required|integer',
            'title' => 'required|string|max:200',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $storedPath = $file->store("private/{$request->document_type}", 'local');

        $doc = SystemDocument::create([
            'document_type' => $request->document_type,
            'entity_type' => $request->entity_type,
            'entity_id' => $request->entity_id,
            'title' => $request->title,
            'file_name' => $fileName,
            'file_path' => $storedPath,
            'file_size_bytes' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'uploaded_by' => $request->user() ? $request->user()->name : 'System Admin',
        ]);

        return response()->json([
            'success' => true,
            'message' => "File '{$fileName}' uploaded securely to local filesystem.",
            'data' => $doc,
        ], 201);
    }

    public function download($id)
    {
        $doc = SystemDocument::findOrFail($id);
        $path = storage_path("app/{$doc->file_path}");

        if (!file_exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Document file not found on server storage.',
            ], 404);
        }

        return response()->download($path, $doc->file_name);
    }
}
