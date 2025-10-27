  import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
  import { Pool } from 'pg';
  import { Inject } from '@nestjs/common';
  import { v4 as uuidv4 } from 'uuid';
  import { GroupsGateway } from './groups.gateway';

  @Injectable()
  export class GroupsService {
    constructor(
      @Inject('PG_CONNECTION') private readonly pool: Pool,
      private readonly gateway: GroupsGateway,
    ) {}

    // Crear grupo y agregar owner como miembro
    async createGroup(ownerId: string, name: string, description?: string, image_url?: string) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        const groupId = uuidv4();
        await client.query(
          `INSERT INTO groups (group_id, owner_id, name, description${image_url ? ', image_url' : ''})
          VALUES ($1, $2, $3, $4${image_url ? ', $5' : ''})`,
          image_url ? [groupId, ownerId, name, description || null, image_url] : [groupId, ownerId, name, description || null],
        );

        // Agregar owner como miembro
        await client.query(
          `INSERT INTO group_members (group_id, owner_id, member_id, name, description)
          VALUES ($1, $2, $2, $3, $4)`,
          [groupId, ownerId, name, description || null],
        );

        await client.query('COMMIT');
        return { group_id: groupId };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // Obtener info de grupo
    async getGroup(groupId: string) {
      const res = await this.pool.query(`SELECT * FROM groups WHERE group_id = $1`, [groupId]);
      if ((res?.rowCount ?? 0) === 0) throw new NotFoundException('Group not found');
      return res.rows[0];
    }

    // Actualizar grupo (solo owner)
    async updateGroup(requesterId: string, groupId: string, fields: { name?: string; description?: string; image_url?: string }) {
      const groupRes = await this.pool.query(`SELECT owner_id FROM groups WHERE group_id = $1`, [groupId]);
      if ((groupRes?.rowCount ?? 0) === 0) throw new NotFoundException('Group not found');
      const ownerId = groupRes.rows[0].owner_id;
      if (ownerId !== requesterId) throw new ForbiddenException('Only owner can edit group');

      const updates: string[] = [];
      const values: any[] = [];
      let idx = 1;
      if (fields.name !== undefined) { updates.push(`name = $${idx++}`); values.push(fields.name); }
      if (fields.description !== undefined) { updates.push(`description = $${idx++}`); values.push(fields.description); }
      if (fields.image_url !== undefined) { updates.push(`image_url = $${idx++}`); values.push(fields.image_url); }

      if (updates.length === 0) return { ok: true };

      values.push(groupId);
      const query = `UPDATE groups SET ${updates.join(', ')} WHERE group_id = $${idx}`;
      await this.pool.query(query, values);

      const updated = (await this.pool.query(`SELECT * FROM groups WHERE group_id = $1`, [groupId])).rows[0];
      this.gateway.emitToGroup(groupId, 'group:updated', updated);
      return updated;
    }

  // Unirse a un grupo
  async joinGroup(userId: string, groupId: string) {
    // Verificar si el grupo existe
    const g = await this.pool.query(
      `SELECT owner_id, name, description FROM groups WHERE group_id = $1::VARCHAR`,
      [groupId],
    );
    if ((g?.rowCount ?? 0) === 0) throw new NotFoundException('Group not found');

    // Insertar miembro (si no existe)
    await this.pool.query(
      `INSERT INTO group_members (group_id, owner_id, member_id, name, description)
      SELECT $1::VARCHAR, owner_id, $2::VARCHAR, name, description
      FROM groups
      WHERE group_id = $1::VARCHAR
      ON CONFLICT DO NOTHING`,
      [groupId, userId],
    );

    // Buscar info del usuario para emitir el evento
    const userRes = await this.pool.query(
      `SELECT user_id, nickname, custom_profile_image_url FROM users WHERE user_id = $1`,
      [userId],
    );

    const member =
      (userRes?.rowCount ?? 0) > 0 ? userRes.rows[0] : { user_id: userId };

    this.gateway.emitToGroup(groupId, 'group:member:joined', { groupId, member });
    return { ok: true };
  }

    async leaveGroup(userId: string, groupId: string) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const gRes = await client.query(
          `SELECT owner_id FROM groups WHERE group_id = $1 FOR UPDATE`,
          [groupId],
        );
        if ((gRes?.rowCount ?? 0) === 0) {
          await client.query('ROLLBACK');
          throw new NotFoundException('Group not found');
        }

        const ownerId = gRes.rows[0].owner_id;

        if (userId === ownerId) {
          // Si el owner se va
          const nextRes = await client.query(
            `SELECT member_id FROM group_members
            WHERE group_id = $1 AND member_id <> $2
            ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
            [groupId, ownerId],
          );

          if ((nextRes?.rowCount ?? 0) > 0) {
            // ✅ Transferir propiedad
            const newOwnerId = nextRes.rows[0].member_id;
            await client.query(`UPDATE groups SET owner_id = $1 WHERE group_id = $2`, [newOwnerId, groupId]);
            await client.query(`DELETE FROM group_members WHERE group_id = $1 AND member_id = $2`, [groupId, ownerId]);

            await client.query('COMMIT');
            this.gateway.emitToGroup(groupId, 'group:member:left', { groupId, memberId: ownerId, newOwnerId });
            this.gateway.emitToGroup(groupId, 'group:updated', { groupId, owner_id: newOwnerId });
            return { ok: true, newOwnerId };
          } else {
            // ✅ Si no quedan miembros, eliminar todo en orden
            await client.query(`DELETE FROM group_members WHERE group_id = $1`, [groupId]);
            await client.query(`DELETE FROM shared_content WHERE group_id = $1`, [groupId]);
            await client.query(`DELETE FROM group_messages WHERE group_id = $1`, [groupId]);
            await client.query(`DELETE FROM groups WHERE group_id = $1`, [groupId]);

            await client.query('COMMIT');
            this.gateway.emitToGroup(groupId, 'group:deleted', { groupId });
            return { ok: true, deleted: true };
          }
        } else {
          // ✅ Miembro normal se va
          await client.query(`DELETE FROM group_members WHERE group_id = $1 AND member_id = $2`, [groupId, userId]);
          await client.query('COMMIT');

          this.gateway.emitToGroup(groupId, 'group:member:left', { groupId, memberId: userId });
          return { ok: true };
        }
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }


    // Listar miembros
    async listMembers(groupId: string) {
      const res = await this.pool.query(
        `SELECT u.user_id, u.nickname, u.custom_profile_image_url, gm.created_at
        FROM group_members gm
        JOIN users u ON u.user_id = gm.member_id
        WHERE gm.group_id = $1
        ORDER BY gm.created_at ASC`,
        [groupId],
      );
      return res.rows;
    }

    // Compartir contenido spotify
    async shareContent(userId: string, groupId: string, spotify_uri: string, content_type: string) {
      const memberCheck = await this.pool.query(`SELECT 1 FROM group_members WHERE group_id=$1 AND member_id=$2`, [groupId, userId]);
      const isMember = (memberCheck?.rowCount ?? 0) > 0;
      if (!isMember) throw new ForbiddenException('Not a member');

      const res = await this.pool.query(
        `INSERT INTO shared_content (group_id, user_id, content_type, spotify_uri) VALUES ($1, $2, $3, $4) RETURNING *`,
        [groupId, userId, content_type, spotify_uri],
      );

      const shared = res.rows[0];
      this.gateway.emitToGroup(groupId, 'group:shared:new', shared);
      return shared;
    }

    // Listar shared content
    async listShared(groupId: string, limit = 50, offset = 0) {
      const res = await this.pool.query(
        `SELECT * FROM shared_content WHERE group_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [groupId, limit, offset],
      );
      return res.rows;
    }

    // Enviar mensaje persistente
    async sendMessage(userId: string, groupId: string, message: string, spotify_uri?: string) {
      const memberCheck = await this.pool.query(`SELECT 1 FROM group_members WHERE group_id=$1 AND member_id=$2`, [groupId, userId]);
      const isMember = (memberCheck?.rowCount ?? 0) > 0;
      if (!isMember) throw new ForbiddenException('Not a member');

      const res = await this.pool.query(
        `INSERT INTO group_messages (group_id, user_id, message, spotify_uri) VALUES ($1, $2, $3, $4) RETURNING *`,
        [groupId, userId, message, spotify_uri || null],
      );

      const msg = res.rows[0];
      this.gateway.emitToGroup(groupId, 'group:message:new', msg);
      return msg;
    }

    // Obtener historial de mensajes
    async listMessages(groupId: string, limit = 50, offset = 0) {
      const res = await this.pool.query(
        `SELECT gm.*, u.nickname, u.custom_profile_image_url
        FROM group_messages gm
        LEFT JOIN users u ON u.user_id = gm.user_id
        WHERE gm.group_id = $1
        ORDER BY gm.created_at DESC
        LIMIT $2 OFFSET $3`,
        [groupId, limit, offset],
      );
      return res.rows;
    }

async listUserGroups(userId: string) {
  const res = await this.pool.query(
    `SELECT DISTINCT ON (g.group_id) g.*
     FROM groups g
     LEFT JOIN group_members gm ON g.group_id = gm.group_id
     WHERE g.owner_id = $1 OR gm.member_id = $1
     ORDER BY g.group_id, g.created_at DESC`,
    [userId],
  );
  return res.rows;
}

    async discoverGroups(userId: string, limit = 18) {
      const res = await this.pool.query(
        `SELECT g.*
        FROM groups g
        WHERE g.group_id NOT IN (SELECT gm.group_id FROM group_members gm WHERE gm.member_id = $1)
          AND g.owner_id != $1
        ORDER BY RANDOM()
        LIMIT $2`,
        [userId, limit],
      );
      return res.rows;
    }

    // Expulsar miembro (solo owner)
    async kickMember(ownerId: string, groupId: string, memberId: string) {
      const gRes = await this.pool.query(`SELECT owner_id FROM groups WHERE group_id = $1`, [groupId]);
      if ((gRes?.rowCount ?? 0) === 0) throw new NotFoundException('Group not found');
      const owner = gRes.rows[0].owner_id;
      if (owner !== ownerId) throw new ForbiddenException('Only owner can remove members');
      if (ownerId === memberId) throw new ConflictException('Owner cannot remove themselves');

      await this.pool.query(`DELETE FROM group_members WHERE group_id = $1 AND member_id = $2`, [groupId, memberId]);
      this.gateway.emitToGroup(groupId, 'group:member:kicked', { groupId, memberId });
      return { ok: true };
    }

    // Comparte spotify_uri en todas las comunidades donde userId es miembro
  async shareToUserGroups(userId: string, spotify_uri: string, content_type: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener grupos donde es miembro
      const groupsRes = await client.query(
        `SELECT group_id FROM group_members WHERE member_id = $1`,
        [userId]
      );
      const groupRows = groupsRes.rows || [];

      if (groupRows.length === 0) {
        await client.query('ROLLBACK');
        return { ok: true, shared: 0, message: 'User is not member of any groups' };
      }

      const sharedRows: any[] = [];

      for (const row of groupRows) {
        const groupId = row.group_id;
        const insertRes = await client.query(
          `INSERT INTO shared_content (group_id, user_id, content_type, spotify_uri)
          VALUES ($1, $2, $3, $4) RETURNING *`,
          [groupId, userId, content_type, spotify_uri]
        );
        const inserted = insertRes.rows[0];
        sharedRows.push(inserted);

        // Emitir evento por grupo para sockets en tiempo real
        try {
          this.gateway.emitToGroup(groupId, 'group:shared:new', inserted);
        } catch (emitErr) {
          // no bloqueamos por falla en emisión
          console.error('Emit error in shareToUserGroups:', emitErr);
        }
      }

      await client.query('COMMIT');
      return { ok: true, shared: sharedRows.length, items: sharedRows };
    } catch (err) {
      await client.query('ROLLBACK').catch(()=>{});
      throw err;
    } finally {
      client.release();
    }
  }

  }
