import { useCallback, useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { cn } from '~/lib/utils'

interface FileUploadProps {
  onFileLoaded: (content: string, filename: string) => void
  isLoading?: boolean
}

export function FileUpload({ onFileLoaded, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (!file.name.endsWith('.csv')) {
        setError('Please upload a .csv file')
        return
      }

      // 10 MB limit
      if (file.size > 10 * 1024 * 1024) {
        setError('File is too large (max 10 MB)')
        return
      }

      setSelectedFile(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (content) {
          onFileLoaded(content, file.name)
        }
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setSelectedFile(null)
      }
      reader.readAsText(file)
    },
    [onFileLoaded],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  function clearFile() {
    setSelectedFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isLoading && 'pointer-events-none opacity-50',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={isLoading}
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedFile}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFile()
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {isLoading && (
                <p className="text-sm text-muted-foreground">Parsing...</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your bank statement here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse. CSV files only (max 10 MB).
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
