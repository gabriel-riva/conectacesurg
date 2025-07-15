import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, X } from 'lucide-react';
import { MaterialFile } from '@/pages/MaterialsPage';

interface FileViewerModalProps {
  file: MaterialFile | null;
  open: boolean;
  onClose: () => void;
  onDownload: (file: MaterialFile) => void;
}

export default function FileViewerModal({ file, open, onClose, onDownload }: FileViewerModalProps) {
  if (!file) return null;

  const isImage = file.fileType.startsWith('image/');
  const isPDF = file.fileType === 'application/pdf';
  const isText = file.fileType.startsWith('text/') || file.fileType === 'application/json';
  const isVideo = file.fileType.startsWith('video/');
  const isAudio = file.fileType.startsWith('audio/');

  const handleExternalView = () => {
    window.open(`/api/materials/files/${file.id}/view`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {file.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExternalView}
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Nova aba
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(file)}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{file.fileType}</span>
            <span>{Math.round(file.fileSize / 1024)} KB</span>
            <span>Por {file.uploader.name}</span>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isImage && (
            <div className="flex justify-center">
              <img 
                src={`/api/materials/files/${file.id}/view`}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          
          {isPDF && (
            <div className="w-full h-96">
              <iframe
                src={`/api/materials/files/${file.id}/view`}
                className="w-full h-full border-0"
                title={file.name}
              />
            </div>
          )}
          
          {isText && (
            <div className="w-full h-96">
              <iframe
                src={`/api/materials/files/${file.id}/view`}
                className="w-full h-full border border-gray-200 rounded"
                title={file.name}
              />
            </div>
          )}
          
          {isVideo && (
            <div className="flex justify-center">
              <video 
                controls
                className="max-w-full max-h-96"
                src={`/api/materials/files/${file.id}/view`}
              />
            </div>
          )}
          
          {isAudio && (
            <div className="flex justify-center p-8">
              <audio 
                controls
                className="w-full max-w-md"
                src={`/api/materials/files/${file.id}/view`}
              />
            </div>
          )}
          
          {!isImage && !isPDF && !isText && !isVideo && !isAudio && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Pré-visualização não disponível para este tipo de arquivo</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExternalView} variant="outline">
                  Abrir em nova aba
                </Button>
                <Button onClick={() => onDownload(file)}>
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}