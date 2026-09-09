import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
  Modal,
  Image,
  Select,
  TextInput,
  FileInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUpload, IconPhoto, IconTrash, IconEye } from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api.js';

interface EvidenceGalleryProps {
  tradeId?: string;
  journalId?: string;
  attachments?: any[];
}

export const EvidenceGallery: React.FC<EvidenceGalleryProps> = ({
  tradeId,
  journalId,
  attachments = [],
}) => {
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [lightboxOpened, { open: openLightbox, close: closeLightbox }] = useDisclosure();
  const [uploadOpened, { open: openUpload, close: closeUpload }] = useDisclosure();

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<string>('ENTRY');
  const [timeframe, setTimeframe] = useState<string>('5M');
  const [caption, setCaption] = useState<string>('');

  const [localAttachments, setLocalAttachments] = useState<any[]>([
    {
      id: 'att-1',
      originalName: 'mgc-5m-sweep-reclaim.png',
      mimeType: 'image/png',
      stage: 'ENTRY',
      timeframe: '5M',
      caption: '5M sweep of Asian low and energetic displacement MSS candle body close.',
      url: 'https://placehold.co/800x450/1e293b/ffffff?text=5M+Sweep+%26+Displacement+Chart',
      createdAt: '2026-09-09T10:10:00Z',
    },
    {
      id: 'att-2',
      originalName: 'mgc-1m-fvg-entry.png',
      mimeType: 'image/png',
      stage: 'ENTRY',
      timeframe: '1M',
      caption: '1M first retracement tap into newly formed FVG at 4435.',
      url: 'https://placehold.co/800x450/0f172a/ffffff?text=1M+First+Retracement+Entry+Chart',
      createdAt: '2026-09-09T10:12:00Z',
    },
  ]);

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: File) => {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (tradeId) formData.append('tradeId', tradeId);
      if (journalId) formData.append('journalId', journalId);
      formData.append('stage', stage);
      formData.append('timeframe', timeframe);
      if (caption) formData.append('caption', caption);

      return apiClient.attachments.upload(formData);
    },
    onSuccess: (savedAttachment) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      setLocalAttachments((p) => [...p, savedAttachment]);
      closeUpload();
      setFile(null);
      setCaption('');
    },
  });

  const handleUpload = () => {
    if (!file) return;
    if (tradeId || journalId) {
      uploadMutation.mutate(file);
    } else {
      const newAtt = {
        id: `att-${Date.now()}`,
        originalName: file.name,
        mimeType: file.type,
        stage,
        timeframe,
        caption,
        url: URL.createObjectURL(file),
        createdAt: new Date().toISOString(),
      };
      setLocalAttachments((p) => [...p, newAtt]);
      closeUpload();
      setFile(null);
      setCaption('');
    }
  };

  const allAttachments = attachments.length > 0 ? attachments : localAttachments;

  return (
    <Card withBorder padding="md" radius="md" style={{ backgroundColor: '#ffffff' }}>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={5} c="slate.8">
            Visual Trade Evidence Gallery ({allAttachments.length})
          </Title>
          <Text size="xs" c="dimmed">
            Multi-timeframe chart snapshots (4H Context, 15M Location, 5M Sweep, 1M Entry, Exit)
          </Text>
        </div>
        <Button
          size="xs"
          variant="light"
          color="indigo"
          leftSection={<IconUpload size={14} />}
          onClick={openUpload}
        >
          Upload Chart
        </Button>
      </Group>

      {allAttachments.length === 0 ? (
        <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center', backgroundColor: '#f8fafc' }}>
          <IconPhoto size={36} color="#94a3b8" />
          <Text size="sm" c="dimmed" mt="xs">
            No chart screenshots attached yet.
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {allAttachments.map((att) => (
            <Card
              key={att.id}
              withBorder
              padding="xs"
              radius="md"
              style={{ cursor: 'pointer', backgroundColor: '#f8fafc' }}
              onClick={() => {
                setSelectedImage(att);
                openLightbox();
              }}
            >
              <Image
                src={att.url || apiClient.attachments.getContentUrl(att.id)}
                alt={att.caption || att.originalName}
                radius="sm"
                h={140}
                fallbackSrc="https://placehold.co/600x400/e2e8f0/64748b?text=Chart+Preview"
              />
              <Group justify="space-between" mt="xs">
                <Badge color="indigo" size="xs">
                  {att.stage} ({att.timeframe || 'Chart'})
                </Badge>
                <Text size="xs" c="dimmed">
                  {att.originalName}
                </Text>
              </Group>
              {att.caption && (
                <Text size="xs" mt={4} lineClamp={2} style={{ color: '#334155' }}>
                  {att.caption}
                </Text>
              )}
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* Upload Modal */}
      <Modal opened={uploadOpened} onClose={closeUpload} title="Attach Chart Screenshot" centered>
        <Stack gap="sm">
          <FileInput
            label="Chart Image (PNG, JPEG, WebP, max 10MB)"
            placeholder="Select file"
            accept="image/png,image/jpeg,image/webp"
            value={file}
            onChange={setFile}
            required
          />
          <SimpleGrid cols={2} spacing="xs">
            <Select
              label="Stage"
              data={[
                { value: 'CONTEXT', label: 'HTF Context' },
                { value: 'LOCATION', label: '15M Location' },
                { value: 'SWEEP', label: '5M Sweep / MSS' },
                { value: 'ENTRY', label: '1M Entry' },
                { value: 'MANAGEMENT', label: 'Management' },
                { value: 'EXIT', label: 'Final Exit' },
                { value: 'REVIEW', label: 'Post Review' },
              ]}
              value={stage}
              onChange={(val) => val && setStage(val)}
            />
            <Select
              label="Timeframe"
              data={[
                { value: '4H', label: '4H' },
                { value: '1H', label: '1H' },
                { value: '15M', label: '15M' },
                { value: '5M', label: '5M' },
                { value: '1M', label: '1M' },
              ]}
              value={timeframe}
              onChange={(val) => val && setTimeframe(val)}
            />
          </SimpleGrid>
          <TextInput
            label="Caption / Technical Notes"
            placeholder="e.g. 5M sweep and displacement MSS body close"
            value={caption}
            onChange={(e) => setCaption(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeUpload}>
              Cancel
            </Button>
            <Button color="indigo" disabled={!file} loading={uploadMutation.isPending} onClick={handleUpload}>
              Upload Evidence
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Lightbox Modal */}
      <Modal
        opened={lightboxOpened}
        onClose={closeLightbox}
        title={selectedImage ? `${selectedImage.stage} — ${selectedImage.originalName}` : 'Chart'}
        size="xl"
        centered
      >
        {selectedImage && (
          <Stack gap="sm">
            <Image
              src={selectedImage.url || apiClient.attachments.getContentUrl(selectedImage.id)}
              alt={selectedImage.caption}
              radius="md"
            />
            {selectedImage.caption && (
              <Paper p="xs" withBorder radius="sm" style={{ backgroundColor: '#f8fafc' }}>
                <Text size="sm">{selectedImage.caption}</Text>
              </Paper>
            )}
          </Stack>
        )}
      </Modal>
    </Card>
  );
};
