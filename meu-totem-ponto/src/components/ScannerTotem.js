import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { supabase } from '../services/supabaseClient';

export function ScannerTotem() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [feedback, setFeedback] = useState({ message: "Aguardando leitura...", type: "info" });
  const [isProcessing, setIsProcessing] = useState(false);

  // Comunicação direta com o Supabase (Sem localStorage)
  const processarPontoNoSupabase = useCallback(async (qrHash) => {
    setIsProcessing(true);
    setFeedback({ message: "Processando...", type: "info" });

    try {
      // 1. Busca o funcionário pelo hash do crachá
      const { data: funcionario, error: funcError } = await supabase
        .from('funcionarios')
        .select('id, nome, ativo')
        .eq('qr_hash', qrHash)
        .single();

      if (funcError || !funcionario) {
        throw new Error("Funcionário não encontrado!");
      }

      if (!funcionario.ativo) {
        throw new Error("Acesso negado: Funcionário inativo!");
      }

      // 2. Insere o registro de ponto no banco
      const { error: pontoError } = await supabase
        .from('registros_ponto')
        .insert([
          { 
            funcionario_id: funcionario.id, 
            data_hora: new Date().toISOString() 
          }
        ]);

      if (pontoError) {
        throw new Error("Erro ao registrar ponto no banco de dados.");
      }

      setFeedback({ 
        message: `Ponto Registrado: ${funcionario.nome}`, 
        type: "success" 
      });

    } catch (error) {
      console.error("Erro:", error.message);
      setFeedback({ message: error.message || "Erro de conexão com o servidor.", type: "error" });
    } finally {
      // Cooldown de 3 segundos para evitar leituras duplicadas seguidas
      setTimeout(() => {
        setFeedback({ message: "Aguardando leitura...", type: "info" });
        setIsProcessing(false);
      }, 3000);
    }
  }, []);

  // Loop de captura e leitura do QR Code
  useEffect(() => {
    let animationFrameId;
    let currentStream = null;

    async function iniciarCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }
        });
        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          await videoRef.current.play();
          loopLeitura();
        }
      } catch (err) {
        console.error("Erro ao acessar a câmera:", err);
        setFeedback({ message: "Erro: Permissão de câmera negada ou indisponível.", type: "error" });
      }
    }

    const loopLeitura = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && !isProcessing) {
          processarPontoNoSupabase(code.data);
        }
      }
      
      animationFrameId = requestAnimationFrame(loopLeitura);
    };

    iniciarCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isProcessing, processarPontoNoSupabase]);

  return (
    <div className="totem-container">
      <h2>Aproxime seu Crachá da Câmera</h2>
      <div className="scanner-box">
        <video ref={videoRef} />
        <canvas ref= {canvasRef} style={{ display: 'none' }} />
      </div>
      <div className={`feedback-display ${feedback.type}`}>
        {feedback.message}
      </div>
    </div>
  );
}