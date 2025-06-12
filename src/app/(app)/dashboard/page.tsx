
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } 
from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from 'next/image';
import { Users, CalendarDays, Trophy, UserPlus, Edit, UploadCloud, Link2, ImagePlus, AlertTriangle, Edit3, ShieldX, Loader2 } from "lucide-react";
import { mockEvents, mockAchievements, mockApplications } from "@/lib/mock-data"; 
import type { Guild, AuditActionType } from '@/types/guildmaster';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription as ShadcnAlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, updateDoc, collection, query, where, getDocs as getFirestoreDocs, limit } from "firebase/firestore"; 
import { db, storage, ref as storageFirebaseRef, uploadBytes, getDownloadURL } from "@/lib/firebase"; 
import { StatCard } from '@/components/shared/StatCard';
import { useHeader } from '@/contexts/HeaderContext';
import { logGuildActivity } from '@/lib/auditLogService';

function DashboardPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter(); 
  const { setHeaderTitle } = useHeader();
  
  const [currentGuild, setCurrentGuild] = useState<Guild | null>(null);
  const [loadingGuild, setLoadingGuild] = useState(true);
  const [isSavingImage, setIsSavingImage] = useState(false);
  
  const { toast } = useToast();

  const [isOwner, setIsOwner] = useState(false);
  const [showEditBannerDialog, setShowEditBannerDialog] = useState(false);
  const [currentBannerUrl, setCurrentBannerUrl] = useState("https://placehold.co/1200x300.png");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [activeBannerTab, setActiveBannerTab] = useState("url");

  const [showEditLogoDialog, setShowEditLogoDialog] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState("https://placehold.co/150x150.png");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [activeLogoTab, setActiveLogoTab] = useState("url");

  useEffect(() => {
    const guildIdParam = searchParams.get('guildId');
    setLoadingGuild(true);
    setHeaderTitle(null); 

    if (authLoading) {
        return;
    }

    if (!user) { 
        setLoadingGuild(false);
        return;
    }

    const fetchGuildData = async () => {
      let guildToSet: Guild | null = null;
      let bannerToSet = "https://placehold.co/1200x300.png";
      let logoToSet = "https://placehold.co/150x150.png";
      let guildIdToLoad = guildIdParam;

      try {
        if (!guildIdToLoad) {
          const qOwned = query(collection(db, "guilds"), where("ownerId", "==", user.uid), limit(1));
          const qMember = query(collection(db, "guilds"), where("memberIds", "array-contains", user.uid), limit(1));
          const [ownedSnapshot, memberSnapshot] = await Promise.all([getFirestoreDocs(qOwned), getFirestoreDocs(qMember)]);

          if (!ownedSnapshot.empty) {
            guildIdToLoad = ownedSnapshot.docs[0].id;
          } else if (!memberSnapshot.empty) {
            guildIdToLoad = memberSnapshot.docs[0].id;
          } else {
            router.push('/guild-selection');
            setLoadingGuild(false);
            setHeaderTitle(null);
            return;
          }
           if (guildIdToLoad) {
             const currentPath = window.location.pathname;
             const newUrl = `${currentPath}?guildId=${guildIdToLoad}`;
             window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
           }
        }
        
        if (guildIdToLoad) {
            const guildDocRef = doc(db, "guilds", guildIdToLoad);
            const guildDocSnap = await getDoc(guildDocRef);

            if (guildDocSnap.exists()) {
              const guildData = guildDocSnap.data() as Omit<Guild, 'id' | 'createdAt'> & { createdAt?: any };
              const isUserOwner = guildData.ownerId === user.uid;
              const isUserMember = guildData.memberIds?.includes(user.uid);

              if (isUserOwner || isUserMember) {
                 guildToSet = { 
                    ...guildData, 
                    id: guildDocSnap.id,
                    createdAt: guildData.createdAt?.toDate ? guildData.createdAt.toDate() : undefined 
                 };
                bannerToSet = guildData.bannerUrl || bannerToSet;
                logoToSet = guildData.logoUrl || logoToSet;
              } else {
                toast({title: "Acesso Negado", description: `Você não tem permissão para visualizar a guilda com ID ${guildIdToLoad}.`, variant: "destructive"});
                router.push('/guild-selection'); 
                setHeaderTitle(null);
              }
            } else {
              toast({title: "Guilda Não Encontrada", description: `Guilda com ID ${guildIdToLoad} não encontrada.`, variant: "destructive"});
               router.push('/guild-selection');
               setHeaderTitle(null);
            }
        } else {
            toast({title: "Nenhuma Guilda", description: "Nenhuma guilda para exibir. Selecione ou crie uma.", variant: "default"});
            router.push('/guild-selection');
            setHeaderTitle(null);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro de Carregamento", description: "Não foi possível carregar os dados da guilda.", variant: "destructive" });
        router.push('/guild-selection'); 
        setHeaderTitle(null);
      } finally {
        setCurrentGuild(guildToSet);
        if (guildToSet) {
          setHeaderTitle(guildToSet.name);
        } else {
          setHeaderTitle(null);
        }
        setCurrentBannerUrl(bannerToSet);
        setCurrentLogoUrl(logoToSet);
        setLoadingGuild(false);
      }
    };
    
    fetchGuildData();
    
    return () => {
      setHeaderTitle(null);
    };

  }, [searchParams, user, toast, authLoading, router, setHeaderTitle]);

  useEffect(() => {
    if (user && currentGuild) {
      setIsOwner(user.uid === currentGuild.ownerId);
    } else {
      setIsOwner(false);
    }
  }, [user, currentGuild]);


  const handleSaveImage = async (type: 'banner' | 'logo', imageUrl?: string | null, imageFile?: File | null) => {
    if (!currentGuild || !currentGuild.id || !user) {
        toast({ title: "Erro", description: "Guilda atual ou usuário não identificado.", variant: "destructive" });
        return;
    }
    if (!isOwner) { // Simplified check, can be expanded based on roles (e.g., ViceLeader too)
        toast({ title: "Permissão Negada", description: "Você não tem permissão para editar esta guilda.", variant: "destructive" });
        return;
    }

    setIsSavingImage(true);
    let finalUrlToSave = imageUrl;

    if (imageFile) {
        const toastId = `upload-${type}-${Date.now()}`;
        toast({ toastId, title: `Fazendo upload do ${type}...`, description: "Por favor, aguarde." });
        try {
            const fileExtension = imageFile.name.split('.').pop();
            const fileName = `${type}_${new Date().getTime()}.${fileExtension}`;
            const filePath = `guilds/${currentGuild.id}/${type}/${fileName}`;
            const imageStorageRef = storageFirebaseRef(storage, filePath);
            
            const uploadResult = await uploadBytes(imageStorageRef, imageFile);
            finalUrlToSave = await getDownloadURL(uploadResult.ref);
            toast({ toastId, title: `${type.charAt(0).toUpperCase() + type.slice(1)} Enviado!`, description: "Salvando na guilda..." });
        } catch (uploadError: any) {
            console.error(`Erro no upload do ${type}:`, uploadError);
            toast({ toastId, title: `Erro no Upload do ${type}`, description: uploadError.message || "Não foi possível enviar o arquivo. Tente novamente.", variant: "destructive" });
            setIsSavingImage(false);
            return; 
        }
    }

    if (!finalUrlToSave) {
        toast({ title: "Erro", description: `Nenhuma imagem ou URL fornecida para o ${type}.`, variant: "destructive" });
        setIsSavingImage(false);
        return;
    }

    try {
        const guildDocRef = doc(db, "guilds", currentGuild.id);
        const fieldToUpdate = type === 'banner' ? 'bannerUrl' : 'logoUrl';
        await updateDoc(guildDocRef, { [fieldToUpdate]: finalUrlToSave });

        // Log activity
        await logGuildActivity(
            currentGuild.id,
            user.uid,
            user.displayName,
            type === 'banner' ? AuditActionType.GUILD_BANNER_UPDATED : AuditActionType.GUILD_LOGO_UPDATED
        );

        if (type === 'banner') {
            setCurrentBannerUrl(finalUrlToSave);
            setCurrentGuild(prev => prev ? {...prev, bannerUrl: finalUrlToSave} : null);
            setShowEditBannerDialog(false);
            setBannerUrlInput("");
            setBannerFile(null);
        } else if (type === 'logo') {
            setCurrentLogoUrl(finalUrlToSave);
            setCurrentGuild(prev => prev ? {...prev, logoUrl: finalUrlToSave} : null);
            setShowEditLogoDialog(false);
            setLogoUrlInput("");
            setLogoFile(null);
        }
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Atualizado!`, description: `O novo ${type} da guilda foi salvo.` });
    } catch (error: any) {
        console.error(`Erro ao atualizar ${type}:`, error);
        toast({ title: `Erro ao Salvar ${type === 'banner' ? 'Banner' : 'Logo'}`, description: error.message || `Não foi possível salvar. Tente novamente.`, variant: "destructive" });
    } finally {
        setIsSavingImage(false);
    }
  };

  const handleSaveBanner = () => {
    if (activeBannerTab === "url") {
      if (!bannerUrlInput) {
        toast({ title: "URL Necessária", description: "Por favor, insira uma URL para o banner.", variant: "destructive" });
        return;
      }
      const allowedHosts = ["imgur.com", "i.imgur.com", "imgbb.com", "ibb.co", "i.ibb.co", "postimages.org", "postimg.cc", "i.postimg.cc", "placehold.co"];
      try {
        const url = new URL(bannerUrlInput);
        if (!allowedHosts.some(host => url.hostname.endsWith(host))) {
          toast({ title: "URL Inválida", description: "Use URLs de Imgur, ImgBB, Postimages ou Placehold.co.", variant: "destructive" });
          return;
        }
        handleSaveImage('banner', bannerUrlInput, null);
      } catch (error) {
        toast({ title: "URL Inválida", description: "A URL fornecida não parece ser válida.", variant: "destructive" });
        return;
      }
    } else if (activeBannerTab === "upload") {
      if (!bannerFile) {
        toast({ title: "Arquivo Necessário", description: "Por favor, selecione um arquivo para o banner.", variant: "destructive" });
        return;
      }
      if (bannerFile.size > 5 * 1024 * 1024) { // 5MB
          toast({ title: "Arquivo Muito Grande", description: "O banner deve ter no máximo 5MB.", variant: "destructive"});
          return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(bannerFile.type)) {
          toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP para o banner.", variant: "destructive"});
          return;
      }
      handleSaveImage('banner', null, bannerFile);
    }
  };

  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
       if (file.size > 5 * 1024 * 1024) { 
          toast({ title: "Arquivo Muito Grande", description: "O banner deve ter no máximo 5MB.", variant: "destructive"});
          event.target.value = ""; 
          setBannerFile(null);
          return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
          toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP para o banner.", variant: "destructive"});
          event.target.value = "";
          setBannerFile(null);
          return;
      }
      setBannerFile(file);
    } else {
      setBannerFile(null);
    }
  };

  const handleSaveLogo = () => {
    if (activeLogoTab === "url") {
      if (!logoUrlInput) {
        toast({ title: "URL Necessária", description: "Por favor, insira uma URL para o logo.", variant: "destructive" });
        return;
      }
      const allowedHosts = ["imgur.com", "i.imgur.com", "imgbb.com", "ibb.co", "i.ibb.co", "postimages.org", "postimg.cc", "i.postimg.cc", "placehold.co"];
      try {
        const url = new URL(logoUrlInput);
        if (!allowedHosts.some(host => url.hostname.endsWith(host))) {
          toast({ title: "URL Inválida", description: "Use URLs de Imgur, ImgBB, Postimages ou Placehold.co.", variant: "destructive" });
          return;
        }
         handleSaveImage('logo', logoUrlInput, null);
      } catch (error) {
        toast({ title: "URL Inválida", description: "A URL fornecida não parece ser válida.", variant: "destructive" });
        return;
      }
    } else if (activeLogoTab === "upload") {
      if (!logoFile) {
        toast({ title: "Arquivo Necessário", description: "Por favor, selecione um arquivo para o logo.", variant: "destructive" });
        return;
      }
       if (logoFile.size > 2 * 1024 * 1024) { // 2MB
          toast({ title: "Arquivo Muito Grande", description: "O logo deve ter no máximo 2MB.", variant: "destructive"});
          return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(logoFile.type)) {
          toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP para o logo.", variant: "destructive"});
          return;
      }
      handleSaveImage('logo', null, logoFile);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) { 
          toast({ title: "Arquivo Muito Grande", description: "O logo deve ter no máximo 2MB.", variant: "destructive"});
          event.target.value = "";
          setLogoFile(null);
          return;
      }
      if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
          toast({ title: "Formato Inválido", description: "Use PNG, JPG, GIF ou WEBP para o logo.", variant: "destructive"});
          event.target.value = "";
          setLogoFile(null);
          return;
      }
      setLogoFile(file);
    } else {
        setLogoFile(null);
    }
  };

  const pageLoading = authLoading || loadingGuild;

  if (pageLoading) {
    return <DashboardPageSkeleton />; 
  }

  if (!user) { 
    return (
      <div className="p-6 text-center text-lg">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-headline mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground mb-4">Você precisa estar logado para ver o dashboard.</p>
        <Button asChild variant="link" className="text-primary">
            <Link href="/login">Fazer Login</Link>
        </Button>
      </div>
    )
  }

  if (!currentGuild) { 
    return (
        <div className="p-6 text-center text-lg">
            <ShieldX className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-headline mb-2">Nenhuma Guilda Carregada</h2>
            <p className="text-muted-foreground mb-4">
            Não foi possível carregar uma guilda. Você pode não pertencer a nenhuma ou ocorreu um erro.
            </p>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <Link href="/guild-selection">Selecionar ou Criar Guilda</Link>
            </Button>
        </div>
    );
  }

  const welcomeName = user?.displayName || user?.email || "Jogador";
  const guildIdForLinks = currentGuild.id;

  return (
    <div className="space-y-8">
      <div className="relative w-full h-48 md:h-60 rounded-lg shadow-lg group z-0">
        <Image
          src={currentBannerUrl}
          alt={`${currentGuild.name} banner`}
          layout="fill"
          objectFit="cover"
          className="transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-lg"
          data-ai-hint="guild banner fantasy"
          priority
          onError={() => setCurrentBannerUrl("https://placehold.co/1200x300.png?text=Error+Loading+Banner")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-lg" />

        {isOwner && (
          <Dialog open={showEditBannerDialog} onOpenChange={(isOpen) => { setShowEditBannerDialog(isOpen); if(!isOpen) { setBannerFile(null); setBannerUrlInput(""); }}}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="absolute top-4 right-4 bg-card/80 hover:bg-card text-foreground opacity-80 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="mr-2 h-4 w-4" /> Editar Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px] bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl flex items-center text-primary"><ImagePlus className="mr-2 h-6 w-6"/>Alterar Banner da Guilda</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Faça upload de uma nova imagem ou insira uma URL para o banner da sua guilda.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="url" className="w-full" onValueChange={setActiveBannerTab}>
                <TabsList className="grid w-full grid-cols-2 bg-input">
                  <TabsTrigger value="url" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Link2 className="mr-2 h-4 w-4"/>Usar URL</TabsTrigger>
                  <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><UploadCloud className="mr-2 h-4 w-4"/>Fazer Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="bannerUrlInput" className="text-foreground">URL da Imagem do Banner</Label>
                    <Input
                      id="bannerUrlInput"
                      placeholder="https://i.imgur.com/seu-banner.png"
                      value={bannerUrlInput}
                      onChange={(e) => setBannerUrlInput(e.target.value)}
                      className="mt-1 form-input"
                    />
                  </div>
                  <Alert variant="default" className="bg-background border-primary/30">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <ShadcnAlertTitle className="font-semibold text-foreground">Sites Permitidos</ShadcnAlertTitle>
                    <ShadcnAlertDescription className="text-xs text-muted-foreground">
                      Use URLs de Imgur, ImgBB, Postimages ou Placehold.co.
                    </ShadcnAlertDescription>
                  </Alert>
                </TabsContent>
                <TabsContent value="upload" className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="bannerFileInput" className="text-foreground">Arquivo do Banner (PNG, JPG, GIF, WEBP - Máx 5MB)</Label>
                    <Input
                      id="bannerFileInput"
                      type="file"
                      accept="image/png, image/jpeg, image/gif, image/webp"
                      onChange={handleBannerFileChange}
                      className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 form-input"
                    />
                  </div>
                  {bannerFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {bannerFile.name}</p>}
                </TabsContent>
              </Tabs>
               <Alert variant="default" className="mt-4 bg-background border-accent/30">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  <ShadcnAlertTitle className="font-semibold text-foreground">Tamanho Ideal</ShadcnAlertTitle>
                  <ShadcnAlertDescription className="text-xs text-muted-foreground">
                    Para melhores resultados, use um banner com dimensões de aproximadamente 1200x300 pixels.
                  </ShadcnAlertDescription>
              </Alert>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => {setShowEditBannerDialog(false); setBannerFile(null); setBannerUrlInput("");}} disabled={isSavingImage}>Cancelar</Button>
                <Button onClick={handleSaveBanner} className="btn-gradient btn-style-secondary" disabled={isSavingImage}>
                    {isSavingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Banner
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
        
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start -mt-16 md:-mt-20 mb-8 relative z-10 px-4">
        <div className="md:col-span-2 flex justify-center md:block"> 
          <div className="relative w-24 h-24 md:w-32 md:h-32 group">
            <Avatar className="w-full h-full border-4 border-background shadow-lg">
              <AvatarImage src={currentLogoUrl} alt={`${currentGuild.name} logo`} data-ai-hint="guild logo emblem" onError={() => setCurrentLogoUrl("https://placehold.co/150x150.png?text=Error")}/>
              <AvatarFallback className="text-4xl md:text-5xl bg-muted text-muted-foreground">
                {currentGuild.name.substring(0,1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <Dialog open={showEditLogoDialog} onOpenChange={(isOpen) => { setShowEditLogoDialog(isOpen); if(!isOpen) { setLogoFile(null); setLogoUrlInput(""); }}}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 h-8 w-8 rounded-full bg-card/80 hover:bg-card text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar Logo da Guilda"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px] bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-headline text-2xl flex items-center text-primary">
                        <ImagePlus className="mr-2 h-6 w-6"/>Alterar Logo da Guilda
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Faça upload de uma nova imagem ou insira uma URL para o logo da sua guilda.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="url" className="w-full" onValueChange={setActiveLogoTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-input">
                    <TabsTrigger value="url" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Link2 className="mr-2 h-4 w-4"/>Usar URL</TabsTrigger>
                    <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><UploadCloud className="mr-2 h-4 w-4"/>Fazer Upload</TabsTrigger>
                    </TabsList>
                    <TabsContent value="url" className="space-y-4 pt-4">
                    <div>
                        <Label htmlFor="logoUrlInput" className="text-foreground">URL da Imagem do Logo</Label>
                        <Input
                        id="logoUrlInput"
                        placeholder="https://i.imgur.com/seu-logo.png"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        className="mt-1 form-input"
                        />
                    </div>
                    <Alert variant="default" className="bg-background border-primary/30">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        <ShadcnAlertTitle className="font-semibold text-foreground">Sites Permitidos</ShadcnAlertTitle>
                        <ShadcnAlertDescription className="text-xs text-muted-foreground">
                         Use URLs de Imgur, ImgBB, Postimages ou Placehold.co.
                        </ShadcnAlertDescription>
                    </Alert>
                    </TabsContent>
                    <TabsContent value="upload" className="space-y-4 pt-4">
                    <div>
                        <Label htmlFor="logoFileInput" className="text-foreground">Arquivo do Logo (PNG, JPG, GIF, WEBP - Máx 2MB)</Label>
                        <Input
                        id="logoFileInput"
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleLogoFileChange}
                        className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 form-input"
                        />
                    </div>
                    {logoFile && <p className="text-sm text-muted-foreground">Arquivo selecionado: {logoFile.name}</p>}
                    </TabsContent>
                  </Tabs>
                  <Alert variant="default" className="mt-4 bg-background border-accent/30">
                    <AlertTriangle className="h-4 w-4 text-accent" />
                    <ShadcnAlertTitle className="font-semibold text-foreground">Tamanho Ideal</ShadcnAlertTitle>
                    <ShadcnAlertDescription className="text-xs text-muted-foreground">
                        Para melhores resultados, use um logo quadrado (ex: 150x150 pixels).
                    </ShadcnAlertDescription>
                  </Alert>
                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => { setShowEditLogoDialog(false); setLogoFile(null); setLogoUrlInput(""); }} disabled={isSavingImage}>Cancelar</Button>
                    <Button onClick={handleSaveLogo} className="btn-gradient btn-style-secondary" disabled={isSavingImage}>
                        {isSavingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar Logo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        <div className="md:col-span-10 md:pt-4 text-center md:text-left"> 
          <h1 className="text-3xl md:text-4xl font-headline text-primary">Bem-vindo(a), {welcomeName}!</h1>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4">
        <StatCard
          title="Membros Ativos"
          value={currentGuild.memberCount.toString()}
          icon={<Users className="h-8 w-8 text-primary" />}
          actionHref={`/dashboard/members?guildId=${guildIdForLinks}`}
          actionLabel="Gerenciar Membros"
        />
        <StatCard
          title="Próximos Eventos"
          value={mockEvents.filter(event => new Date(event.date) >= new Date() && event.guildId === currentGuild.id).length.toString()}
          icon={<CalendarDays className="h-8 w-8 text-primary" />}
          actionHref={`/dashboard/calendar?guildId=${guildIdForLinks}`}
          actionLabel="Ver Calendário"
        />
        <StatCard
          title="Conquistas Totais"
          value={mockAchievements.filter(ach => ach.guildId === currentGuild.id).length.toString()}
          icon={<Trophy className="h-8 w-8 text-primary" />}
          actionHref={`/dashboard/timeline?guildId=${guildIdForLinks}`}
          actionLabel="Ver Conquistas"
        />
        <StatCard
          title="Candidaturas Pendentes"
          value={mockApplications.filter(app => app.status === 'pending' && app.guildId === currentGuild.id).length.toString()}
          icon={<UserPlus className="h-8 w-8 text-primary" />}
          actionHref={`/dashboard/recruitment/applications?guildId=${guildIdForLinks}`}
          actionLabel="Revisar Candidaturas"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8 px-4">
        <Card className="card-bg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center"><CalendarDays className="mr-3 h-7 w-7 text-primary" /> Próximos Eventos</CardTitle>
            <CardDescription className="text-muted-foreground">Não perca estas atividades agendadas!</CardDescription>
          </CardHeader>
          <CardContent>
            {mockEvents.filter(event => event.guildId === currentGuild.id && new Date(event.date) >= new Date()).slice(0, 3).map(event => (
              <div key={event.id} className="mb-4 pb-4 border-b border-border last:border-b-0 last:mb-0 last:pb-0">
                <h4 className="font-semibold text-lg text-foreground">{event.title}</h4>
                <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {event.time}</p>
                <p className="text-sm mt-1 line-clamp-2 text-foreground/80">{event.description}</p>
              </div>
            ))}
            {mockEvents.filter(event => event.guildId === currentGuild.id && new Date(event.date) >= new Date()).length === 0 && (
              <p className="text-muted-foreground">Nenhum evento futuro agendado para esta guilda.</p>
            )}
            <Button variant="outline" className="mt-4 w-full border-primary text-primary hover:bg-primary/10" asChild>
              <Link href={`/dashboard/calendar?guildId=${guildIdForLinks}`}>Ver Todos os Eventos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-bg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center"><Trophy className="mr-3 h-7 w-7 text-primary" /> Conquistas Recentes</CardTitle>
            <CardDescription className="text-muted-foreground">Celebre as últimas conquistas da sua guilda.</CardDescription>
          </CardHeader>
          <CardContent>
            {mockAchievements.filter(ach => ach.guildId === currentGuild.id).sort((a,b) => new Date(b.dateAchieved).getTime() - new Date(a.dateAchieved).getTime()).slice(0, 3).map(ach => (
              <div key={ach.id} className="mb-4 pb-4 border-b border-border last:border-b-0 last:mb-0 last:pb-0">
                <h4 className="font-semibold text-lg text-foreground">{ach.title}</h4>
                <p className="text-sm text-muted-foreground">{new Date(ach.dateAchieved).toLocaleDateString('pt-BR')} - {ach.category}</p>
                <p className="text-sm mt-1 line-clamp-2 text-foreground/80">{ach.description}</p>
              </div>
            ))}
            {mockAchievements.filter(ach => ach.guildId === currentGuild.id).length === 0 && (
                <p className="text-muted-foreground">Nenhuma conquista registrada para esta guilda.</p>
            )}
             <Button variant="outline" className="mt-4 w-full border-primary text-primary hover:bg-primary/10" asChild>
              <Link href={`/dashboard/timeline?guildId=${guildIdForLinks}`}>Ver Linha do Tempo Completa</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardPageSkeleton() { 
 return (
      <div className="space-y-8">
        <Skeleton className="h-48 md:h-60 w-full rounded-lg" /> 
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start -mt-16 md:-mt-20 mb-8 relative z-10 px-4">
          <div className="md:col-span-2 flex justify-center md:justify-start">
            <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background shadow-lg" /> 
          </div>
          <div className="md:col-span-10 md:pt-4 space-y-2 text-center md:text-left">
            <Skeleton className="h-10 w-3/4 mx-auto md:mx-0" />
            <Skeleton className="h-6 w-1/2 mx-auto md:mx-0" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
         <div className="grid gap-6 lg:grid-cols-2 mt-8 px-4">
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </div>
    );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}
