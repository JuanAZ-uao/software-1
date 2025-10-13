export const getNotifications = async (req, res) => {
  // Por ahora retornamos notificaciones mock basadas en el usuario
  const notifications = [
    { 
      id: 'n1', 
      title: 'Bienvenido a Universidad Connect', 
      type: 'sistema', 
      date: Date.now(), 
      read: false 
    },
    { 
      id: 'n2', 
      title: 'Tu evento "Conferencia IA" fue aprobado', 
      type: 'evento', 
      date: Date.now() - 86400000, 
      read: false 
    },
    { 
      id: 'n3', 
      title: 'Nueva organización registrada', 
      type: 'organizacion', 
      date: Date.now() - 172800000, 
      read: true 
    }
  ];
  
  res.json({
    success: true,
    data: notifications
  });
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  
  // Aquí implementarías la lógica para marcar como leída en BD
  console.log(`Marcando notificación ${id} como leída`);
  
  res.json({
    success: true,
    message: 'Notificación marcada como leída'
  });
};

export const markAllAsRead = async (req, res) => {
  // Marcar todas las notificaciones como leídas
  res.json({
    success: true,
    message: 'Todas las notificaciones marcadas como leídas'
  });
};