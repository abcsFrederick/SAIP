import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';
import AuthTemplate from './templates/authTemplate.pug'
import View from './views/View';

var domain = 'http://localhost:3000/';
var VMpro = 'https://frsivg-mip01p.ncifcrf.gov/v0.1/';
var VMdev = 'https://frsivg-mip01d.ncifcrf.gov/v0.1/';

var App = View.extend({
  initialize(){
    this.$el.html(AuthTemplate());
    this.domain = domain;
    $.ajax({
        url:this.domain+"accessRequest",
        type:"GET",

        xhrFields: {
          withCredentials: true
        },
          success:_.bind(function(res){
            console.log(res.code);
            if(res.code == '1'){
                $('#request_msg').html(res.msg+', and you will be redirect to portal in 3 seconds');
                setTimeout(function(){ 
                    window.location.replace('https://frsivg-mip01d.ncifcrf.gov/SAIP');
                //      window.location.replace('https://frsivg-mip01p.ncifcrf.gov/SAIP');
                }, 3000);
            }
            else if(res.code == '3'){
              $('#request_msg').html(res.msg);
            }
            else if(res.code == '4'){
              $('#request_msg').html(res.msg);
            }
            else if(res.code == '6'){
              $('#request_msg').html(res.msg);
            }else{
            //  window.location.replace('https://authtest.nih.gov/siteminderagent/SmMakeCookie.ccc?NIHSMSESSION=QUERY&PERSIST=0&TARGET=-SM-HTTPS%3a%2f%2fncif--f5%2encifcrf%2egov%2fSignIn%2fNihLoginIntegration%2eaxd%3freturnUrl%3dhttp-%3a-%2f-%2flocalhost%3a8888');
            //  window.location.replace('https://frsivg-mip01d.ncifcrf.gov')
        //      window.location.replace('https://frsivg-mip01p.ncifcrf.gov')
              window.location.replace('file:///Users/miaot2/html_learning/SAIP/Frontend/public/loginPageDev.html')
              
            }
            // if(res.status =='Authenticated')
            // {
            //   this.is_admin=res.Group_id.includes(7);
            //   /*phase2*/
            //   this.probeCollection = new ProbeCollection({
            //     domain:this.domain
            //   });
            //   this.probeCollection.fetch({
            //     xhrFields: {
            //       withCredentials: true             // override ajax to send with credential
            //   },
            //   success:(_.bind(function(res){
            //     console.log('probes collection');
            //     console.log(res.toJSON());
            //   },this))
            //   });
            //   if(this.is_admin){
            //     this.usersCollection = new UsersCollection({
            //       domain:this.domain
            //     });
            //     this.usersCollection.fetch({
            //       xhrFields: {
            //         withCredentials: true             // override ajax to send with credential
            //     },
            //     success:(_.bind(function(res){
            //       console.log('users collection');
            //       console.log(res);
            //     },this))
            //     });

            //     this.protocolsCollection = new ProtocolsCollection({
            //       domain:this.domain
            //     });
            //     this.protocolsCollection.fetch({
            //       xhrFields: {
            //         withCredentials: true             // override ajax to send with credential
            //     },
            //     success:(_.bind(function(res){
            //       console.log('protocols collection');
            //       console.log(res.toJSON());
            //     },this))
            //     });
            //   }
            //   this.controlPanel = new ControlPanel({
            //     admin:this.is_admin,  //res.Group_id.includes(10) no admin
            //     el:this.$('.playground'),
            //     domain_ws:this.domain_ws,
            //     domain:this.domain,
            //     user_id:res.User_id[0],
            //     LoginAdminUser:res,
            //     users:this.usersCollection||'',
            //     probes:this.probeCollection||'',
            //     protocols:this.protocolsCollection||''
            //   })

            //   this.user = res.msg;
            //   if(this.is_admin){
            //     $('#NCIAdminUser').html('&nbsp;&nbsp;&nbsp;('+res.FirstName+' '+res.LastName+')');
            //   }else{
            //     $('#NCIEndUser').html('&nbsp;&nbsp;&nbsp;('+res.FirstName+' '+res.LastName+')');
            //   }
            //   $('#appVersion').html(' v'+res.appVersion)
            
            // var testingRes = [{"nci_projects_name":"ABCC Folder","nci_projects_created_at":"2010-09-15T02:17:10.000Z","nci_projects_updated_at":"2011-02-14T22:37:44.000Z","site_users_id":3,"site_users_last_name":"Miao","site_users_first_name":"Tianyi","nci_project_users_project_id":58},{"nci_projects_name":"ABCC","nci_projects_created_at":"2010-09-15T02:17:09.000Z","nci_projects_updated_at":"2010-09-15T02:17:09.000Z","site_users_id":3,"site_users_last_name":"Miao","site_users_first_name":"Tianyi","nci_project_users_project_id":33}];

            // }
            // else{
            
            //   window.location.replace('file:///Users/miaot2/html_learning/SAIP/Frontend/public/loginPageDev.html')
              
            // }
        },this)
    });
  }
});
export default App;