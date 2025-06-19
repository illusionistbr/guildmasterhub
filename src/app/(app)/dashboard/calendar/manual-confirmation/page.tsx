
"use client";

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react'; 
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, doc, getDoc, setDoc, serverTimestamp, Timestamp, ref as storageFirebaseRef, uploadBytes, getDownloadURL } from '@/lib/firebase';
import type { Guild, Event as GuildEvent, ManualConfirmation, UserProfile } from '@/types/guildmaster';
import { AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, UploadCloud, Link2 as LinkIcon, AlertTriangle, CheckCircle, ShieldAlert, Image as ImageIcon, Ban, HelpCircle } from 'lucide-react';
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
  const [invalidUrlParams, setInvalidUrlParams] = useState(false);

  const isMountedRef = useRef(true); 

  const form = useForm<ManualConfirmationFormValues>({
    resolver: zodResolver(manualConfirmationSchema),
    defaultValues: {
      screenshotUrl: "",
      notes: "",
    },
  });

  const fetchEventAndConfirmationData = useCallback(async (currentGuildId: string, currentEventId: string) => {
    if (!currentUser || !currentGuildId || !currentEventId) {
      if (isMountedRef.current) setLoadingData(false);
      return;
    }
    if (isMountedRef.current) setLoadingData(true);
    try {
      const guildDocRef = doc(db, "guilds", currentGuildId);
      const eventDocRef = doc(db, `guilds/${currentGuildId}/events`, currentEventId);
      const manualConfirmationDocRef = doc(db, `guilds/${currentGuildId}/events/${currentEventId}/manualConfirmations`, currentUser.uid);

      const [guildSnap, eventSnap, confirmationSnap] = await Promise.all([
        getDoc(guildDocRef),
        getDoc(eventDocRef),
        getDoc(manualConfirmationDocRef)
      ]);

      if (!isMountedRef.current) return;

      if (!guildSnap.exists()) {
        toast({ title: "Guilda não encontrada", variant: "destructive" });
        router.push('/guild-selection'); return;
      }
      const guildData = {id: guildSnap.id, ...guildSnap.data()} as Guild;
      setGuild(guildData);
      

      if (!eventSnap.exists()) {
        toast({ title: "Evento não encontrado", variant: "destructive" });
        router.push(`/dashboard/calendar?guildId=${currentGuildId}`); return;
      }
      const eventData = {id: eventSnap.id, ...eventSnap.data()} as GuildEvent;
      setEvent(eventData);
      setHeaderTitle(`Conf. Manual: ${eventData.title} (${guildData.name})`);


      if (eventData.attendeesWithPin?.includes(currentUser.uid)) {
        setPinUsed(true);
      }

      if (confirmationSnap.exists()) {
        setExistingConfirmation({id: confirmationSnap.id, ...confirmationSnap.data()} as ManualConfirmation);
      } else {
        setExistingConfirmation(null); 
      }

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      if (isMountedRef.current) toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
    } finally {
      if (isMountedRef.current) setLoadingData(false);
    }
  }, [currentUser, router, toast, setHeaderTitle]);


  useEffect(() => {
    isMountedRef.current = true;
    setLoadingData(true); 
    setInvalidUrlParams(false);

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

    if (!guildIdParam) {
        toast({ title: "ID da Guilda Ausente", description: "ID da guilda não fornecido na URL.", variant: "destructive" });
        router.push('/guild-selection');
        setInvalidUrlParams(true); 
        setLoadingData(false);
        return;
    }
    
    if (!eventIdParam) {
        toast({ title: "Informações incompletas", description: "ID do evento não fornecido na URL. Por favor, selecione um evento no calendário.", variant: "destructive" });
        setInvalidUrlParams(true); 
        setHeaderTitle("Confirmação Manual"); 
        setLoadingData(false);
        return;
    }
    
    fetchEventAndConfirmationData(guildIdParam, eventIdParam);
    
    return () => {
      isMountedRef.current = false;
      setHeaderTitle(null);
    };
  }, [authLoading, currentUser, searchParams, router, toast, fetchEventAndConfirmationData, setHeaderTitle]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if(isMountedRef.current) toast({ title: "Arquivo Muito Grande", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" });
        form.setValue("screenshotFile", undefined);
        if(isMountedRef.current) setPreviewImage(null);
        e.target.value = "";
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
        if(isMountedRef.current) toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP.", variant: "destructive" });
        form.setValue("screenshotFile", undefined);
        if(isMountedRef.current) setPreviewImage(null);
        e.target.value = "";
        return;
      }
      form.setValue("screenshotFile", file);
      form.setValue("screenshotUrl", "");
      const reader = new FileReader();
      reader.onloadend = () => {
        if (!isMountedRef.current) return;
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
      if(isMountedRef.current) setPreviewImage(null);
    }
  };

  const onSubmit: SubmitHandler<ManualConfirmationFormValues> = async (data) => {
    const guildIdFromParams = searchParams.get('guildId');
    const eventIdFromParams = searchParams.get('eventId');

    if (!currentUser || !guildIdFromParams || !eventIdFromParams || !event) {
      if(isMountedRef.current) toast({ title: "Erro", description: "Dados essenciais ausentes.", variant: "destructive" });
      return;
    }
    if (pinUsed || existingConfirmation) {
      if(isMountedRef.current) toast({ title: "Ação não permitida", description: "Confirmação já realizada ou PIN utilizado.", variant: "destructive" });
      return;
    }

    if(isMountedRef.current) setIsSubmitting(true);
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
        if(isMountedRef.current) {
          toast({ title: "Erro de Imagem", description: "Nenhuma imagem fornecida ou falha no upload.", variant: "destructive" });
          setIsSubmitting(false);
        }
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

      if (isMountedRef.current) {
        toast({ title: "Confirmação Enviada!", description: "Sua submissão manual foi enviada para aprovação." });
        if (guildIdFromParams && eventIdFromParams) {
          fetchEventAndConfirmationData(guildIdFromParams, eventIdFromParams); 
        }
        form.reset();
        setPreviewImage(null);
      }

    } catch (error) {
      console.error("Erro ao enviar confirmação:", error);
      if (isMountedRef.current) toast({ title: "Erro ao Enviar", variant: "destructive" });
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  if (invalidUrlParams) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-center">
        <Card className="w-full max-w-lg static-card-container">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-3 h-8 w-8"/>
              Informações Incompletas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground">
              Para submeter ou visualizar uma confirmação manual, um evento específico precisa ser selecionado.
            </p>
            <p className="text-muted-foreground mt-2">
              Por favor, navegue até o calendário, selecione um evento e então escolha a opção de confirmação manual.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full btn-gradient btn-style-primary" onClick={() => {
                const gid = searchParams.get('guildId'); 
                if (gid) router.push(`/dashboard/calendar?guildId=${gid}`);
                else router.push('/guild-selection');
            }}>
              <span>Voltar para o Calendário</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (loadingData || authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!guild || !event) {
    return <div className="text-center py-10 text-destructive">Não foi possível carregar os dados da guilda ou do evento.</div>;
  }

  const eventDateTime = format(new Date(`${event.date}T${event.time}`), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const getStatusBadge = (status: ManualConfirmation['status']) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/50">Pendente</span>;
      case 'approved': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-600 border border-green-500/50">Aprovada</span>;
      case 'rejected': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-600 border border-red-500/50">Rejeitada</span>;
      default: return null;
    }
  };

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
          <AlertTitle className="font-semibold">PIN Utilizado com Sucesso</AlertTitle>
          <AlertDescription>
            Sua presença para este evento já foi confirmada utilizando o código PIN. Nenhuma ação adicional é necessária.
          </AlertDescription>
        </Alert>
      ) : existingConfirmation ? (
        <Card className="static-card-container">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                <span>Sua Confirmação Manual</span>
                {getStatusBadge(existingConfirmation.status)}
            </CardTitle>
             <CardDescription>
                Detalhes da sua submissão para o evento <span className="font-semibold text-foreground">{event.title}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p><strong>Enviado em:</strong> {existingConfirmation.submittedAt ? format(existingConfirmation.submittedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Data indisponível'}</p>
            {existingConfirmation.screenshotUrl && (
              <div>
                <strong className="block mb-1">Screenshot Enviado:</strong>
                <div className="mt-1 rounded-md overflow-hidden border max-w-xs shadow-md bg-muted/20 p-1">
                  <Image src={existingConfirmation.screenshotUrl} alt="Screenshot Enviado" width={300} height={200} className="rounded" objectFit="contain" data-ai-hint="event screenshot"/>
                </div>
              </div>
            )}
            {existingConfirmation.notes && <p><strong>Suas Notas:</strong> <span className="text-muted-foreground italic">{existingConfirmation.notes}</span></p>}
            {existingConfirmation.status === 'rejected' && existingConfirmation.rejectionReason && (
                <Alert variant="destructive" className="mt-3">
                    <Ban className="h-4 w-4" />
                    <AlertTitle>Motivo da Rejeição</AlertTitle>
                    <AlertDescription>{existingConfirmation.rejectionReason}</AlertDescription>
                </Alert>
            )}
            {existingConfirmation.status === 'approved' && (
                 <Alert variant="default" className="mt-3 bg-green-500/10 border-green-500/30 text-green-700">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle>Confirmação Aprovada!</AlertTitle>
                    <AlertDescription>
                        Sua participação foi aprovada.
                        {existingConfirmation.dkpAwarded && existingConfirmation.dkpAwarded > 0
                        ? ` ${existingConfirmation.dkpAwarded} DKP foram creditados.`
                        : guild.dkpSystemEnabled && event.dkpValue && event.dkpValue > 0
                            ? ` ${event.dkpValue} DKP foram creditados.`
                            : ' Nenhum DKP foi concedido para este evento.'}
                    </AlertDescription>
                </Alert>
            )}
             {existingConfirmation.status === 'pending' && (
                <Alert variant="default" className="mt-3 bg-yellow-500/10 border-yellow-500/30 text-yellow-700">
                    <HelpCircle className="h-5 w-5 text-yellow-600" />
                    <AlertTitle>Confirmação Pendente</AlertTitle>
                    <AlertDescription>Sua submissão está aguardando aprovação de um administrador da guilda.</AlertDescription>
                </Alert>
            )}
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
                        <div className="mt-2 border rounded-md p-2 inline-block bg-muted/30 shadow-sm">
                            <Image src={previewImage} alt="Prévia da Screenshot" width={200} height={150} className="rounded" objectFit="contain" data-ai-hint="submission preview"/>
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

    
