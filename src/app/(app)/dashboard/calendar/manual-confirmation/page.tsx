
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, doc, getDoc, setDoc, serverTimestamp, Timestamp, ref as storageFirebaseRef, uploadBytes, getDownloadURL } from '@/lib/firebase';
import type { Guild, Event as GuildEvent, ManualConfirmation, AuditActionType as AuditActionTypeEnum, UserProfile } from '@/types/guildmaster';
import { AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, UploadCloud, Link2 as LinkIcon, AlertTriangle, CheckCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const manualConfirmationSchema = z.object({
  screenshotUrl: z.string().url({ message: "Por favor, insira uma URL de imagem válida (ex: Imgur)." }).optional(),
  screenshotFile: z.instanceof(File).optional(),
  notes: z.string().max(500, "Notas podem ter no máximo 500 caracteres.").optional(),
}).refine(data => data.screenshotUrl || data.screenshotFile, {
  message: "Forneça uma URL ou faça upload de um arquivo de screenshot.",
  path: ["screenshotUrl"], 
});

type ManualConfirmationFormValues = z.infer<typeof manualConfirmationSchema>;

function ManualConfirmationPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [event, setEvent] = useState<GuildEvent | null>(null);
  const [existingConfirmation, setExistingConfirmation] = useState<ManualConfirmation | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinUsed, setPinUsed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<ManualConfirmationFormValues>({
    resolver: zodResolver(manualConfirmationSchema),
    defaultValues: {
      screenshotUrl: "",
      notes: "",
    },
  });

  useEffect(() => {
    setHeaderTitle("Confirmação Manual");
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  const fetchEventAndConfirmationData = useCallback(async (currentGuildId: string, currentEventId: string) => {
    if (!currentUser) { 
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const guildDocRef = doc(db, "guilds", currentGuildId);
      const eventDocRef = doc(db, `guilds/${currentGuildId}/events`, currentEventId);
      const manualConfirmationDocRef = doc(db, `guilds/${currentGuildId}/events/${currentEventId}/manualConfirmations`, currentUser.uid);

      const [guildSnap, eventSnap, confirmationSnap] = await Promise.all([
        getDoc(guildDocRef),
        getDoc(eventDocRef),
        getDoc(manualConfirmationDocRef)
      ]);

      if (!guildSnap.exists()) {
        toast({ title: "Guilda não encontrada", variant: "destructive" });
        router.push('/guild-selection'); return;
      }
      const guildData = guildSnap.data() as Guild;
      setGuild(guildData);
      setHeaderTitle(`Conf. Manual: ${guildData.name}`);


      if (!eventSnap.exists()) {
        toast({ title: "Evento não encontrado", variant: "destructive" });
        router.push(`/dashboard/calendar?guildId=${currentGuildId}`); return;
      }
      const eventData = eventSnap.data() as GuildEvent;
      setEvent(eventData);

      if (eventData.attendeesWithPin?.includes(currentUser.uid)) {
        setPinUsed(true);
      }

      if (confirmationSnap.exists()) {
        setExistingConfirmation(confirmationSnap.data() as ManualConfirmation);
      }

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, router, toast, setHeaderTitle]); 


  useEffect(() => {
    // Get fresh parameter values inside the effect that depends on searchParams
    const guildIdParam = searchParams.get('guildId');
    const eventIdParam = searchParams.get('eventId');

    if (authLoading) {
      return;
    }

    if (!currentUser) {
      const redirectPath = `/login?redirect=/dashboard/calendar/manual-confirmation?guildId=${guildIdParam || ''}&eventId=${eventIdParam || ''}`;
      router.push(redirectPath);
      setLoadingData(false); 
      return;
    }

    const isValidGuildId = typeof guildIdParam === 'string' && guildIdParam.trim() !== "" && guildIdParam !== "null" && guildIdParam !== "undefined";
    const isValidEventId = typeof eventIdParam === 'string' && eventIdParam.trim() !== "" && eventIdParam !== "null" && eventIdParam !== "undefined";

    if (isValidGuildId && isValidEventId) {
      fetchEventAndConfirmationData(guildIdParam, eventIdParam);
    } else {
      setLoadingData(false); 
      toast({ title: "Informações incompletas", description: "ID da guilda ou evento não fornecido na URL.", variant: "destructive" });
      if (!isValidGuildId) {
        router.push('/guild-selection');
      } else {
        router.push(`/dashboard/calendar?guildId=${guildIdParam}`);
      }
    }
  }, [authLoading, currentUser, searchParams, router, toast, fetchEventAndConfirmationData]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        toast({ title: "Arquivo Muito Grande", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
        form.setValue("screenshotFile", undefined);
        setPreviewImage(null);
        e.target.value = ""; 
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
        toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP.", variant: "destructive" });
        form.setValue("screenshotFile", undefined);
        setPreviewImage(null);
        e.target.value = ""; 
        return;
      }
      form.setValue("screenshotFile", file);
      form.setValue("screenshotUrl", ""); 
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPreviewImage(reader.result);
        } else {
          setPreviewImage(null);
          toast({title: "Erro na Prévia", description: "Não foi possível gerar a prévia da imagem.", variant: "destructive"});
        }
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("screenshotFile", undefined);
      setPreviewImage(null);
    }
  };

  const onSubmit: SubmitHandler<ManualConfirmationFormValues> = async (data) => {
    const guildIdFromParams = searchParams.get('guildId'); // Re-fetch for safety, though should be stable
    const eventIdFromParams = searchParams.get('eventId');

    if (!currentUser || !guildIdFromParams || !eventIdFromParams || !event) {
      toast({ title: "Erro", description: "Dados essenciais ausentes.", variant: "destructive" });
      return;
    }
    if (pinUsed || existingConfirmation) {
      toast({ title: "Ação não permitida", description: "Confirmação já realizada ou PIN utilizado.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let imageUrl = data.screenshotUrl || "";

    try {
      if (data.screenshotFile) {
        const file = data.screenshotFile;
        const fileExtension = file.name.split('.').pop();
        const fileName = `${Date.now()}-${currentUser.uid}.${fileExtension}`;
        const filePath = `guilds/${guildIdFromParams}/event_confirmations/${eventIdFromParams}/${currentUser.uid}/${fileName}`;
        const imageStorageRef = storageFirebaseRef(storage, filePath);

        const uploadResult = await uploadBytes(imageStorageRef, file);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      if (!imageUrl) {
        toast({ title: "Erro de Imagem", description: "Nenhuma imagem fornecida ou falha no upload.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const confirmationData: ManualConfirmation = {
        userId: currentUser.uid,
        userDisplayName: currentUser.displayName || currentUser.email,
        eventId: eventIdFromParams,
        eventTitle: event.title,
        screenshotUrl: imageUrl,
        notes: data.notes || "",
        submittedAt: serverTimestamp() as Timestamp,
        status: 'pending',
      };

      const confirmationDocRef = doc(db, `guilds/${guildIdFromParams}/events/${eventIdFromParams}/manualConfirmations`, currentUser.uid);
      await setDoc(confirmationDocRef, confirmationData);

      await logGuildActivity(
        guildIdFromParams,
        currentUser.uid,
        currentUser.displayName,
        AuditActionType.MANUAL_CONFIRMATION_SUBMITTED,
        { eventId: eventIdFromParams, eventName: event.title, targetUserId: currentUser.uid, screenshotUrl: imageUrl }
      );

      toast({ title: "Confirmação Enviada!", description: "Sua submissão manual foi enviada para aprovação." });
      if (guildIdFromParams && eventIdFromParams) { 
        fetchEventAndConfirmationData(guildIdFromParams, eventIdFromParams);
      }
      form.reset();
      setPreviewImage(null);

    } catch (error) {
      console.error("Erro ao enviar confirmação:", error);
      toast({ title: "Erro ao Enviar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loadingData || authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!guild || !event) {
    return <div className="text-center py-10 text-destructive">Não foi possível carregar os dados da guilda ou do evento.</div>;
  }
  
  const eventDateTime = format(new Date(`${event.date}T${event.time}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageTitle
        title="Confirmação Manual de Presença"
        description={`Evento: ${event.title} (${eventDateTime})`}
        icon={<Edit className="h-8 w-8 text-primary" />}
      />

      {pinUsed ? (
        <Alert variant="default" className="bg-green-500/10 border-green-500/30 text-green-700">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="font-semibold">PIN Utilizado</AlertTitle>
          <AlertDescription>
            Sua presença para este evento já foi confirmada utilizando o código PIN. Nenhuma ação adicional é necessária.
          </AlertDescription>
        </Alert>
      ) : existingConfirmation ? (
        <Card className="static-card-container">
          <CardHeader>
            <CardTitle>Sua Confirmação Manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p><strong>Status:</strong> <span className={`font-semibold ${existingConfirmation.status === 'pending' ? 'text-yellow-500' : existingConfirmation.status === 'approved' ? 'text-green-500' : 'text-red-500'}`}>{existingConfirmation.status.charAt(0).toUpperCase() + existingConfirmation.status.slice(1)}</span></p>
            <p><strong>Enviado em:</strong> {existingConfirmation.submittedAt ? format(existingConfirmation.submittedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Data indisponível'}</p>
            {existingConfirmation.screenshotUrl && (
              <div>
                <strong>Screenshot:</strong>
                <div className="mt-2 rounded-md overflow-hidden border max-w-xs">
                  <Image src={existingConfirmation.screenshotUrl} alt="Screenshot Enviado" width={300} height={200} objectFit="contain" data-ai-hint="event screenshot"/>
                </div>
              </div>
            )}
            {existingConfirmation.notes && <p><strong>Suas Notas:</strong> {existingConfirmation.notes}</p>}
            {existingConfirmation.status === 'rejected' && existingConfirmation.rejectionReason && <p className="text-destructive"><strong>Motivo da Rejeição:</strong> {existingConfirmation.rejectionReason}</p>}
             {existingConfirmation.status === 'approved' && <p className="text-green-600 font-semibold">DKP ({existingConfirmation.dkpAwarded || event.dkpValue || 0}) creditado!</p>}
          </CardContent>
        </Card>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="static-card-container">
              <CardHeader>
                <CardTitle>Enviar Prova de Participação</CardTitle>
                <CardDescription>
                  Use este formulário para enviar uma prova de sua participação no evento.
                  Você pode colar uma URL de imagem (Imgur, etc.) ou fazer upload do arquivo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="screenshotUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Screenshot</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input {...field} placeholder="https://i.imgur.com/..." className="form-input pl-10" disabled={!!form.watch("screenshotFile")} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="text-center text-sm text-muted-foreground my-2">OU</div>
                <FormField
                  control={form.control}
                  name="screenshotFile"
                  render={({ field: { onChange, value, ...rest } }) => ( 
                    <FormItem>
                      <FormLabel>Upload da Screenshot (Máx 2MB: PNG, JPG, GIF, WEBP)</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <UploadCloud className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="file"
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            onChange={handleFileChange} 
                            className="form-input pl-10 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            disabled={!!form.watch("screenshotUrl")}
                            {...rest}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {previewImage && (
                    <div className="mt-4">
                        <FormLabel>Prévia da Imagem:</FormLabel>
                        <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30">
                            <Image src={previewImage} alt="Prévia da Screenshot" width={200} height={150} objectFit="contain" data-ai-hint="submission preview"/>
                        </div>
                    </div>
                )}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionais (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Alguma observação sobre sua participação ou prova..." rows={3} className="form-input" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="btn-gradient btn-style-primary ml-auto" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ImageIcon className="mr-2 h-5 w-5" />}
                  Enviar Confirmação
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}


export default function ManualConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <ManualConfirmationPageContent />
    </Suspense>
  );
}

