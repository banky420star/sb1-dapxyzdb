//+------------------------------------------------------------------+
//| ZmqDealerEA.mq5 – minimal MT5 ⇆ Python ZeroMQ bridge             |
//+------------------------------------------------------------------+
#property copyright "MTF-Bot"
#property link      "https://example.com"
#property version   "0.9"

//==================== DLL IMPORTS (64-bit libzmq.dll) ==============
#import "libzmq.dll"
   long  zmq_ctx_new();
   int   zmq_ctx_term(long);
   long  zmq_socket(long,int);
   int   zmq_close(long);
   int   zmq_bind(long,string);
   int   zmq_connect(long,string);
   int   zmq_send(long,uchar&[],int,int);
   int   zmq_recv(long,uchar&[],int,int);
#import

#define ZMQ_PUB 1
#define ZMQ_REP 4
#define ZMQ_DONTWAIT 1

//==================== USER INPUTS ==================================
input string Inp_PubEndpoint = "tcp://*:5556";      // MT5 → Python
input string Inp_RepEndpoint = "tcp://*:5555";      // Python → MT5
input int    Inp_HeartbeatSec = 1;
input bool   Inp_PublishTicks = true;
input int    Inp_LogLevel     = 2;                  // 0-Silent … 3-Verbose
input int    Inp_Magic        = 123456;
input int    Inp_SlipPts      = 3;

//==================== GLOBALS ======================================
long  g_ctx  = 0;
long  g_pub  = 0;
long  g_rep  = 0;
datetime lastBeat = 0;

//==================== LOG HELPERS ==================================
void log(int lvl,const string txt){ if(lvl<=Inp_LogLevel) Print("ZMQ-EA: ",txt); }

//==================== STR MINIPARSERS ==============================
string jval(const string src,const string key,const string def=""){
   string t="\""+key+"\":\""; int p=StringFind(src,t); if(p<0) return def;
   int s=p+StringLen(t), e=StringFind(src,"\"",s);    return StringSubstr(src,s,e-s);
}
double jnum(const string s,const string k,double d=0){ return (double)StringToDouble(jval(s,k,DoubleToString(d))); }

//==================== EA LIFECYCLE =================================
int OnInit()
{
   // build context / sockets
   g_ctx = zmq_ctx_new();
   g_pub = zmq_socket(g_ctx,ZMQ_PUB);
   g_rep = zmq_socket(g_ctx,ZMQ_REP);

   if(zmq_bind(g_pub , Inp_PubEndpoint )!=0){ log(0,"PUB bind fail"); return(INIT_FAILED); }
   if(zmq_bind(g_rep , Inp_RepEndpoint )!=0){ log(0,"REP bind fail"); return(INIT_FAILED); }

   EventSetTimer(Inp_HeartbeatSec);
   log(1,"ZMQ sockets up & running");
   return(INIT_SUCCEEDED);
}
//------------------------------------------------------------------
void OnDeinit(const int r)
{
   zmq_close(g_pub); zmq_close(g_rep); zmq_ctx_term(g_ctx);
   EventKillTimer();
   log(1,"EA unloaded");
}
//------------------------------------------------------------------
void OnTimer(){ heartbeat(); if(Inp_PublishTicks) pubTick(); pollReq(); }
//------------------------------------------------------------------

//==================== HEARTBEAT / PUB ==============================
void heartbeat()
{
   uchar buf[];  string m=StringFormat("{\"hb\":%d}",TimeCurrent());
   StringToCharArray(m,buf);
   zmq_send(g_pub,buf,ArraySize(buf),0);
}
//------------------------------------------------------------------
void pubTick()
{
   MqlTick t; if(!SymbolInfoTick(_Symbol,t)) return;
   uchar buf[];
   string j=StringFormat("{\"type\":\"tick\",\"sym\":\"%s\",\"bid\":%f,\"ask\":%f,\"ts\":%d}",
                         _Symbol,t.bid,t.ask,t.time);
   StringToCharArray(j,buf); zmq_send(g_pub,buf,ArraySize(buf),0);
}

//==================== REP POLLING =================================
void pollReq()
{
   uchar buf[256]; // enough for simple commands
   int r=zmq_recv(g_rep,buf,256,ZMQ_DONTWAIT);
   if(r<=0) return;

   string req=CharArrayToString(buf,0,r);
   string act=jval(req,"action","");
   string resp="{}";

   if(act=="ping") resp="{\"pong\":1}";
   else if(act=="order") resp = doOrder(req);

   uchar o[]; StringToCharArray(resp,o);
   zmq_send(g_rep,o,ArraySize(o),0);
}

//==================== ORDER HELPER ================================
string doOrder(const string req)
{
   string side=jval(req,"side","");
   double vol =jnum(req,"vol",0.01);

   int typ=side=="buy"  ? ORDER_TYPE_BUY  :
           side=="sell" ? ORDER_TYPE_SELL : -1;
   if(typ<0) return "{\"err\":\"side\"}";

   MqlTradeRequest tr={}; MqlTradeResult rs={};
   tr.action=TRADE_ACTION_DEAL; tr.symbol=_Symbol;
   tr.volume=vol; tr.type=typ; tr.magic=Inp_Magic;
   tr.deviation=Inp_SlipPts; tr.type_filling=ORDER_FILLING_FOK;
   tr.price=(typ==ORDER_TYPE_BUY)?SymbolInfoDouble(_Symbol,SYMBOL_ASK)
                                 :SymbolInfoDouble(_Symbol,SYMBOL_BID);

   bool ok=OrderSend(tr,rs);
   return ok && rs.retcode==TRADE_RETCODE_DONE?
         StringFormat("{\"ticket\":%d}",rs.order):
         StringFormat("{\"err\":%d}",rs.retcode);
}