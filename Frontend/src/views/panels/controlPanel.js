import $ from 'jquery'
import _ from 'underscore'
import Backbone from 'backbone'

import Projects_overview from '../projects/projects_overview'
import users from '../users/users'
import mapping from '../mapping/mapping'
import protocol from '../protocols/protocol'
import groups from '../groups/groups';

import probe from '../probes/probe'
import access from '../access/access'
import about from '../about/about'
import statistics from '../statistics/statistics'
import View from '../View'
import eventsBus from '../../eventsBus'
import UsersCollection from '../../collections/users/users_overview';
import ProbeCollection from '../../collections/probes/probes_overview';
import ProtocolsCollection from '../../collections/protocols/protocols_overview';

import AccessRequestsCollection from '../../collections/users/accessRequests_overview'

import ControlPanelTemplate from '../../templates/panels/controlPanel.pug'
import '../../stylesheets/panels/controlPanel.styl'

var controlPanel = View.extend({
  events: {
    'click .projects': 'projects',
    'click .mapping': 'mapping',
    'click .users': 'usersRender',
    'click .group': 'groupsRender',
    'click .protocol': 'protocol',
    'click .probe': 'probesRender',
    'click .statistics': 'statistics',
    'click .accessRequest': 'accessRequest',
    'click .about': 'about',
    'click .TESTWS': 'TESTWS'
  },
  initialize (setting) {
    this.is_admin = this.permission = setting.permission;
    this.admin_groups = setting.admin_groups || "";
    this.is_sys_admin = setting.is_sys_admin;
    this.domain_ws = setting.domain_ws;
    this.domain = setting.domain;
    this.user_id = setting.user_id;
    this.LoginAdminUser = setting.LoginAdminUser;
    this.probes = setting.probes;
    this.protocols = setting.protocols;
    this.users = setting.users;

    this.accessRequestsCollection = new AccessRequestsCollection({
      domain: this.domain
    });
    this.accessRequestsCollection.fetch({
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        this.$el.html(ControlPanelTemplate({
          admin: this.permission,
          system_admin: this.is_sys_admin,
          numberOfRequest: res.filter((x) => x.get('status') === 'pending').length || ''
        }));
      }, this))
    })
    this.probes = new ProbeCollection({
      domain: this.domain
    });
    this.probes.fetch({
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log('probes collection');
        console.log(res.toJSON());
      }, this))
    });
    if (this.permission > 0) {
      this.users = new UsersCollection({
        domain: this.domain
      });
      
      this.users.fetch({
        data: $.param({ 
          permission: this.permission,
          groups: this.admin_groups
        }),
        processData: false,
        contentType: false, 
        dataType: 'json',
        xhrFields: {
          withCredentials: true							// override ajax to send with credential
        },
        success: (_.bind(function (res) {
          console.log('users collection');
          console.log(res);

          // this.usersRender();
        }, this))
      });
      this.protocols = new ProtocolsCollection({
        domain: this.domain
      });
      this.protocols.fetch({
        xhrFields: {
          withCredentials: true							// override ajax to send with credential
        },
        success: (_.bind(function (res) {
          console.log('protocols collection');
          console.log(res.toJSON());
        }, this))
      });
    }
    eventsBus.on('addNewProject', this.projects, this)
    eventsBus.on('addNewUserEvent', this.usersRender, this)
    eventsBus.on('addNewGroupEvent', this.groupsRender, this)
    eventsBus.on('addNewUserEvent_access', this.accessRequest, this)
    eventsBus.on('addNewProbeEvent', this.probesRender, this)
    // eventsBus.on('goAbout',this.about,this);
  },
  projects (e) {
    if (e !== undefined) {
      $(e.currentTarget).parent().parent().children().children().removeClass('active')
      $(e.currentTarget).addClass('active')
    }
    //	window.test=$(e.currentTarget);
    if (this.projectsView) {
      this.projectsView.close()	// prevent from zombie view
    }

    this.projectsView = new Projects_overview({
      permission: this.permission,
      domain: this.domain,
      domain_ws: this.domain_ws,
      user_id: this.user_id,
      users: this.users,
      probes: this.probes,
      LoginAdminUser: this.LoginAdminUser,
      protocols: this.protocols,
      mappingAttrReserve: $('.mapping')
    })
    $('#PUMA').html(this.projectsView.el)
  },
  mapping (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    if (this.mappingView) {
      this.mappingView.close()	// prevent from zombie view
    }
    this.mappingView = new mapping({
      domain: this.domain,
      preSelectProject: $(e.currentTarget).attr('preselectproject'),
      preSelectExp: $(e.currentTarget).attr('preselectexp'),
      probes: this.probes
    })
    $('#PUMA').html(this.mappingView.el)
    // console.log('zoombie');
  },
  usersRender (e) {
    if (e !== undefined) {
      $(e.currentTarget).parent().parent().children().children().removeClass('active')
      $(e.currentTarget).addClass('active')
    }
    if (this.usersView) {
      this.usersView.close()	// prevent from zombie view
    }
    this.usersView = new users({
      user_id: this.user_id,
      permission: this.permission,
      admin_groups: this.admin_groups,
      users: this.users,
      accessRequest: this.accessRequest,
      domain: this.domain
    })									// if this.render() call el is not been set up yet
    $('#PUMA').html(this.usersView.el)	// render order matter
    this.usersView.render()
    
    this.users.fetch({
      data: $.param({ 
        permission: this.permission,
        groups: this.admin_groups
      }),
      processData: false,
      contentType: false, 
      dataType: 'json',
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log('users collection');
        console.log(res);
      }, this))
    });
  },
  groupsRender (e) {
    if (e !== undefined) {
      this.$('.active').removeClass('active')
      $(e.currentTarget).addClass('active');
    }
    if (this.groupsView) {
      this.groupsView.close();	// prevent from zombie view
    }
    this.groupsView = new groups({
      admin: this.is_sys_admin,
      domain: this.domain,
      users: this.users
    })
    $('#PUMA').html(this.groupsView.el)
  },
  protocol (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    if (this.protocolView) {
      this.protocolView.close()	// prevent from zombie view
    }
    this.protocolView = new protocol({
      admin: this.is_admin,
      domain: this.domain,
      users: this.users,
      probes: this.probes,
      mappingAttrReserve: $('.mapping')
    })
    $('#PUMA').html(this.protocolView.el)
  },
  probesRender (e) {
    if (e !== undefined) {
      $(e.currentTarget).parent().parent().children().children().removeClass('active')
      $(e.currentTarget).addClass('active')
    }
    if (this.probeView) {
      this.probeView.close()	// prevent from zombie view
    }
    this.probeView = new probe({
      domain: this.domain,
      admin: this.is_admin
    })
    $('#PUMA').html(this.probeView.el)

    this.probeCollection = new ProbeCollection({
      domain: this.domain
    })
    this.probeCollection.fetch({
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log('probes collection')
        console.log(res.toJSON())
      }, this))
    })
    this.probes = this.probeCollection
  },
  statistics (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    if (this.statisticsView) {
      this.statisticsView.close()	// prevent from zombie view
    }
    this.statisticsView = new statistics({
      domain: this.domain,
      admin: this.is_admin
    })
    $('#PUMA').html(this.statisticsView.el)
  },
  accessRequest (e) {
    if (e !== undefined) {
      $(e.currentTarget).parent().parent().children().children().removeClass('active')
      $(e.currentTarget).addClass('active')
    }
    if (this.accessView) {
      this.accessView.close()	// prevent from zombie view
    }
    this.accessView = new access({
      domain: this.domain,
      admin: this.is_admin
    })
    $('.badge-notify').hide()
    $('#PUMA').html(this.accessView.el)
  },
  about (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    if (this.aboutView) {
      this.aboutView.close()	// prevent from zombie view
    }
    this.aboutView = new about({
      admin: this.is_admin,
      domain: this.domain
    })
    $('#PUMA').html(this.aboutView.el)
  },
  // TESTWS (e) {
  //   var ws = new WebSocket(this.domain_ws + 'api/v1/testWS');
  //   ws.onopen = function () {
  //     console.log('websocket is connected ...');
  //   }
  //   ws.onmessage = function (ev) {
  //     console.log(ev.data);
  //   }
  // }
})

export default controlPanel
